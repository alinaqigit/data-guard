import { ParentDTO } from "./Parent.dto";

export class createPolicyDTO extends ParentDTO {
  name = "name";
  pattern = "pattern";
  type = "type";
  description = "description";
}
