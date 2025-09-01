export interface User {
  user_id: number;
  name: string;
  current_vocab_id: number | null;
}

export interface Chat {
  chat_id: number;
  title: string;
}

export type QueryResult<Row = any> = { rows: Row[] };
export interface Database {
  query: <Row = any>(text: string, params?: any[]) => Promise<QueryResult<Row>>;
}
