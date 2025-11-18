export interface EntityDefinition {
  id: string;
  name: string;
  url: string;
  description?: string;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;
  // Section titles for form organization
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;
}
