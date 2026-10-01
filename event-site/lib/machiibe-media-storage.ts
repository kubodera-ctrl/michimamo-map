import {createHash} from 'node:crypto';

export type MachiibeMediaStorageObject={
  key:string;
  body:Uint8Array;
  contentType:'image/png';
  sha256:string;
  bytes:number;
};

export type MachiibeMediaStorageReceipt={
  key:string;
  sha256:string;
  bytes:number;
  private:true;
  etag:string|null;
};

export interface MachiibeMediaStorageAdapter{
  kind:'disabled'|'memory';
  canWrite:boolean;
  putPrivateObject(input:MachiibeMediaStorageObject):Promise<MachiibeMediaStorageReceipt>;
  deletePrivateObject(key:string):Promise<void>;
}

export function sha256Bytes(bytes:Uint8Array){
  return createHash('sha256').update(bytes).digest('hex');
}

export function createDisabledMachiibeMediaStorageAdapter():MachiibeMediaStorageAdapter{
  return {
    kind:'disabled',
    canWrite:false,
    async putPrivateObject(){
      throw new Error('machiibe media storage is not configured');
    },
    async deletePrivateObject(){
      return;
    }
  };
}

export function createMemoryMachiibeMediaStorageAdapter(){
  const objects=new Map<string,{bytes:Uint8Array;sha256:string;contentType:string}>();
  const adapter:MachiibeMediaStorageAdapter={
    kind:'memory',
    canWrite:true,
    async putPrivateObject(input){
      if(input.bytes!==input.body.byteLength) throw new Error('media byte length mismatch');
      const actual=sha256Bytes(input.body);
      if(actual!==input.sha256) throw new Error('media sha256 mismatch');
      objects.set(input.key,{bytes:new Uint8Array(input.body),sha256:actual,contentType:input.contentType});
      return {key:input.key,sha256:actual,bytes:input.bytes,private:true,etag:actual};
    },
    async deletePrivateObject(key){
      objects.delete(key);
    }
  };
  return {adapter,objects};
}

// P5 boundary: actual R2 binding is intentionally not connected yet.
// Until a reviewed R2 adapter replaces this provider, upload routes fail closed
// before any DB media state is committed.
export function getMachiibeMediaStorageAdapter():MachiibeMediaStorageAdapter{
  return createDisabledMachiibeMediaStorageAdapter();
}
