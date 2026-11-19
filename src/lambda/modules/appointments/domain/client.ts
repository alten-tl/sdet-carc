export interface ClientProps {
  id: string;
  name: string;
  timezone: string;
  address: string;
}

export class Client {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  readonly address: string;

  constructor(props: ClientProps) {
    this.id = props.id;
    this.name = props.name;
    this.timezone = props.timezone;
    this.address = props.address;
  }
}
