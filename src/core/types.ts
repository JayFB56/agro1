export type Registro = {
  id: string; // unique id (raw line or provided)
  codigo: string;
  peso: number;
  fecha: string; // dd/mm/yyyy
  hora: string; // HH:MM
  turno: string; // AM | PM
  raw: string;
};

export type StorageStatus = "pending" | "synced" | "failed";

export type StoredRegistro = Registro & {
  uid: string;
  status: StorageStatus;
  createdAt: string; 
};

export type WriteResult = {
  added: number;
  skipped: number;
  ids: string[];
};
