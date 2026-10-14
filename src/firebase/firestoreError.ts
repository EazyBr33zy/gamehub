import { auth } from './config';
import { showToast } from '../utils/toast';
import { OWNER_UID } from '../config/owner';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    isOwner?: boolean;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const err = error as any;
  const errorCode = err?.code || (typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : '');
  const errorMessage = err?.message || (error instanceof Error ? error.message : String(error));
  const currentUid = auth.currentUser?.uid;
  const isOwnerUid = currentUid === OWNER_UID;

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    code: errorCode,
    authInfo: {
      userId: currentUid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      isOwner: isOwnerUid,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  console.error(`Firestore Error [${errorCode || 'unknown'}]:`, JSON.stringify(errInfo, null, 2));

  const isDev = Boolean(import.meta.env?.DEV);

  // Check if permission-denied
  const isPermissionDenied = 
    errorCode === 'permission-denied' || 
    errorMessage.toLowerCase().includes('permission-denied') || 
    errorMessage.toLowerCase().includes('insufficient permissions');

  if (isPermissionDenied) {
    if (!isOwnerUid) {
      showToast('Você não está logado como dono. Saia e entre com a conta correta.', 'error', undefined, 6000);
      return errInfo;
    } else {
      const devMsg = isDev ? `Permissão negada no Firestore [${errorCode}]. Verifique os tipos de dados ou as regras.` : 'Permissão negada ao salvar no servidor. Verifique os dados informados.';
      showToast(devMsg, 'error', undefined, 6000);
      return errInfo;
    }
  }

  // Other operations
  if (operationType === OperationType.CREATE || operationType === OperationType.UPDATE || operationType === OperationType.WRITE) {
    const msg = isDev && errorCode 
      ? `Não foi possível salvar [${errorCode}]: ${errorMessage}` 
      : 'Não foi possível salvar. Tente novamente.';
    showToast(msg, 'error', undefined, 5000);
  } else if (operationType === OperationType.DELETE) {
    const msg = isDev && errorCode 
      ? `Não foi possível excluir [${errorCode}]: ${errorMessage}` 
      : 'Não foi possível excluir. Tente novamente.';
    showToast(msg, 'error', undefined, 5000);
  }

  return errInfo;
}
