import type { FieldValue } from "./types";

export interface FormServicePayload {
  data: Record<string, FieldValue>;
  relations: Record<string, string[]>;
}

export interface FormServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface UniversalFormService<T = unknown> {
  create?: (payload: FormServicePayload) => Promise<FormServiceResult<T>>;
  update?: (
    payload: FormServicePayload & { instanceId: string }
  ) => Promise<FormServiceResult<T>>;
  delete?: (payload: { instanceId: string }) => Promise<FormServiceResult<T>>;
}

export interface UniversalFormCallbacks<T = unknown> {
  afterCreate?: (result: FormServiceResult<T>) => void;
  afterUpdate?: (result: FormServiceResult<T>) => void;
  afterDelete?: (result: FormServiceResult<T>) => void;
}
