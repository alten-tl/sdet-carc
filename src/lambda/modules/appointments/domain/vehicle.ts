export interface VehicleProps {
  id: string;
  vin: string;
  plates: string;
  color: string;
  year: number;
  model: string;
}

export class Vehicle {
  readonly id: string;
  readonly vin: string;
  readonly plates: string;
  readonly color: string;
  readonly year: number;
  readonly model: string;

  constructor(props: VehicleProps) {
    this.id = props.id;
    this.vin = props.vin;
    this.plates = props.plates;
    this.color = props.color;
    this.year = props.year;
    this.model = props.model;
  }
}
