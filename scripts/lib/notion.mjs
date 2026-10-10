// Notion API のクライアント（依存なし）と、テスト用のフィクスチャ読み込み。
//
// 注意: Notion は 2025-09-03 版で「データベース」と「データソース」を分けました。
//  - 新方式: GET /databases/{id} の data_sources[0].id を使い、POST /data_sources/{id}/query で取得
//  - 旧方式: POST /databases/{id}/query
// どちらでも動くように、data_sources が無ければ旧方式に切り替えます。
import fs from 'node:fs/promises';

const API = 'https://api.notion.com/v1';
const MIN_INTERVAL_MS = 350; // Notion の目安は平均3リクエスト/秒

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createNotionSource({ token, databaseId, dataSourceId, version = '2025-09-03', fetchImpl = fetch, log = console }) {
  if (!token) throw new Error('NOTION_TOKEN が未設定です');
  if (!databaseId) throw new Error('NOTION_DATABASE_ID が未設定です');
  let last = 0;

  async function request(method, pathname, body) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const wait = last + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      const res = await fetchImpl(API + pathname, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': version,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
        log.warn(`  Notion API ${res.status}。${retryAfter}秒後に再試行します (${attempt + 1}/6)`);
        await sleep(retryAfter * 1000);
        continue;
      }
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text.slice(0, 200) };
      }
      if (!res.ok) {
        const err = new Error(`Notion API エラー ${res.status} (${method} ${pathname.split('?')[0]}): ${json.code || ''} ${json.message || json.raw || ''}`.trim());
        err.status = res.status;
        err.code = json.code;
        throw err;
      }
      return json;
    }
    throw new Error(`Notion API が繰り返し失敗しました: ${method} ${pathname.split('?')[0]}`);
  }

  async function resolveQueryTarget() {
    if (dataSourceId) return { kind: 'data_source', id: dataSourceId };
    const db = await request('GET', `/databases/${databaseId}`);
    const ds = Array.isArray(db.data_sources) && db.data_sources[0];
    if (ds?.id) {
      if (db.data_sources.length > 1) log.warn(`  データソースが${db.data_sources.length}個あります。先頭「${ds.name}」を使います（NOTION_DATA_SOURCE_ID で指定可）`);
      return { kind: 'data_source', id: ds.id };
    }
    return { kind: 'database', id: databaseId };
  }

  async function queryPages() {
    const target = await resolveQueryTarget();
    const pathname = target.kind === 'data_source' ? `/data_sources/${target.id}/query` : `/databases/${target.id}/query`;
    const pages = [];
    let cursor;
    do {
      const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
      let json;
      try {
        json = await request('POST', pathname, body);
      } catch (e) {
        // 公式ドキュメントでメソッドの記載が揺れているため、405 のときだけ PATCH を試す
        if (e.status !== 405) throw e;
        json = await request('PATCH', pathname, body);
      }
      pages.push(...(json.results || []));
      cursor = json.has_more ? json.next_cursor : undefined;
    } while (cursor);
    return pages.filter((p) => p.object === 'page');
  }

  async function listBlocks(blockId) {
    const blocks = [];
    let cursor;
    do {
      const q = new URLSearchParams({ page_size: '100' });
      if (cursor) q.set('start_cursor', cursor);
      const json = await request('GET', `/blocks/${blockId}/children?${q}`);
      blocks.push(...(json.results || []));
      cursor = json.has_more ? json.next_cursor : undefined;
    } while (cursor);
    return blocks;
  }

  return { queryPages, listBlocks };
}

/** ネットワークに出ずに試すための読み込み元。fixture は { pages: [...], blocks: { <id>: [...] } } */
export async function createFixtureSource(fixturePath) {
  const data = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  return {
    async queryPages() {
      return data.pages;
    },
    async listBlocks(id) {
      return data.blocks?.[id] || [];
    },
  };
}
