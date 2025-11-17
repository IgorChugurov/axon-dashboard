export interface EntityDefinition {
  id: string;
  name: string;
  url: string;
  description?: string;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;
}
