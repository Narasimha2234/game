export class PlaceBetDto {
  userId: string;
  selectedNumber: number;
  amount: number;
}

export class ResolveBetDto {
  diceRolls: number[];
}
