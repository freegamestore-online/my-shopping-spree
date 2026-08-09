export type GamePhase = "menu" | "playing" | "over";

export type ItemKind =
  | "apple"
  | "banana"
  | "milk"
  | "cookie"
  | "star"
  | "ice_cream";

export interface ShopItem {
  id: number;
  x: number;
  z: number;
  kind: ItemKind;
  points: number;
}
