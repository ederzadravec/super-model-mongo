declare module 'objectid' {
  import { ObjectId } from 'mongoose';
  
  function objectid(id?: string | ObjectId): ObjectId;
  
  namespace objectid {
    function isValid(id: unknown): boolean;
  }
  
  export = objectid;
}