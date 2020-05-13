export type Networks = 'mainnet' | 'morden' | 'ropsten' | 'rinkeby' | 'goerli' | 'kovan' | 'private'

export const HOPR_TOKEN: { [key in Networks]: string } = {
  mainnet: undefined,
  morden: undefined,
  ropsten: undefined,
  rinkeby: '0x25f4408b0F75D1347335fc625E7446F2CdEcD503',
  goerli: undefined,
  kovan: '0x591aE064387AB09805D9fF9206F0A90DB8F4C9B2',
  private: '0x66DB78F4ADD912a6Cb92b672Dfa09028ecc3085E',
}

export const HOPR_CHANNELS: { [key in Networks]: string } = {
  mainnet: undefined,
  morden: undefined,
  ropsten: undefined,
  rinkeby: '0x077209b19F4Db071254C468E42784588003be34C',
  goerli: undefined,
  kovan: '0x506De99826736032cF760586ECce0bae1369155b',
  private: '0x902602174a9cEb452f60c09043BE5EBC52096200',
}

export const HOPR_MINTER: { [key in Networks]: string } = {
  mainnet: undefined,
  morden: undefined,
  ropsten: undefined,
  rinkeby: undefined,
  goerli: undefined,
  kovan: undefined,
  private: '0x902602174a9cEb452f60c09043BE5EBC52096200',
}
