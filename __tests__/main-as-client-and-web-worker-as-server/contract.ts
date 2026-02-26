export interface IAPI {
  echo(message: string): string
  error(message: string): never
  loop(): never
}
