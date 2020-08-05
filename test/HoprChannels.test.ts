import { BN, time, expectEvent, expectRevert } from '@openzeppelin/test-helpers'
import { NODE_SEEDS } from '@hoprnet/hopr-demo-seeds'
import {
  HoprChannelsContract,
  HoprChannelsInstance,
  HoprTokenContract,
  HoprTokenInstance,
} from '../types/truffle-contracts'
import { recoverSigner, keccak256, Ticket, getChannelId, getParties, Fund } from './utils'
import { stringToU8a, u8aToHex } from '@hoprnet/hopr-utils'
import { randomBytes } from 'crypto'
import secp256k1 from 'secp256k1'
import { PromiseType } from '../types/typescript'
import { random } from 'core-js/fn/number'

const HoprToken: HoprTokenContract = artifacts.require('HoprToken')
const HoprChannels: HoprChannelsContract = artifacts.require('HoprChannels')

const formatAccount = (res: PromiseType<HoprChannelsInstance['accounts']>) => ({
  hashedSecret: res[0],
  counter: res[1],
})

const formatChannel = (res: PromiseType<HoprChannelsInstance['channels']>) => ({
  deposit: res[0],
  partyABalance: res[1],
  closureTime: res[2],
  stateCounter: res[3],
})

// const PrintGasUsed = (name: string) => (
//   response: Truffle.TransactionResponsepartyBPrivKeyed);
//   return response;
// };

contract('HoprChannels', function ([accountA, accountB]) {
  const { partyA, partyB } = getParties(accountA, accountB)

  const partyAPrivKey = NODE_SEEDS[1]
  const partyBPrivKey = NODE_SEEDS[0]

  const depositAmount = web3.utils.toWei('1', 'ether')
  let hoprToken: HoprTokenInstance
  let hoprChannels: HoprChannelsInstance

  const reset = async () => {
    hoprToken = await HoprToken.new()

    // mint supply
    await hoprToken.mint(partyA, web3.utils.toWei('100', 'ether'), '0x00', '0x00')
    await hoprToken.mint(partyB, web3.utils.toWei('100', 'ether'), '0x00', '0x00')

    hoprChannels = await HoprChannels.new(hoprToken.address, time.duration.days(2))
  }

  // integration tests: reset contracts once
  // describe('integration tests', function () {
  //   before(async function () {
  //     await reset()
  //   })

  //   context("make payments between 'partyA' and 'partyB' using a fresh channel and 'fundChannel'", function () {
  //     const partyASecret1 = keccak256({
  //       type: 'bytes32',
  //       value: keccak256({ type: 'string', value: 'partyA secret 1' }),
  //     })
  //     const partyASecret2 = keccak256({
  //       type: 'bytes32',
  //       value: partyASecret1,
  //     })

  //     const partyBSecret1 = keccak256({
  //       type: 'bytes32',
  //       value: keccak256({ type: 'string', value: 'partyB secret 1' }),
  //     })
  //     const partyBSecret2 = keccak256({
  //       type: 'bytes32',
  //       value: partyBSecret1,
  //     })

  //     it("'partyA' should fund 'partyA' with 1 HOPR", async function () {
  //       const receipt = await hoprToken.send(
  //         hoprChannels.address,
  //         depositAmount,
  //         web3.eth.abi.encodeParameters(['address', 'address'], [partyA, partyB]),
  //         {
  //           from: partyA,
  //         }
  //       )

  //       expectEvent.inTransaction(receipt.tx, HoprChannels, 'FundedChannel', {
  //         funder: partyA,
  //         recipient: partyA,
  //         counterParty: partyB,
  //         recipientAmount: depositAmount,
  //         counterPartyAmount: new BN(0),
  //       })

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.deposit.eq(new BN(depositAmount))).to.be.equal(true, 'wrong deposit')
  //       expect(channel.partyABalance.eq(new BN(depositAmount))).to.be.equal(true, 'wrong partyABalance')
  //       expect(channel.stateCounter.eq(new BN(1))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("'partyB' should fund 'partyB' with 1 HOPR", async function () {
  //       const receipt = await hoprToken.send(
  //         hoprChannels.address,
  //         depositAmount,
  //         web3.eth.abi.encodeParameters(['address', 'address'], [partyB, partyA]),
  //         {
  //           from: partyB,
  //         }
  //       )

  //       expectEvent.inTransaction(receipt.tx, HoprChannels, 'FundedChannel', {
  //         funder: partyB,
  //         recipient: partyB,
  //         counterParty: partyA,
  //         recipientAmount: depositAmount,
  //         counterPartyAmount: new BN(0),
  //       })

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.deposit.eq(new BN(depositAmount).mul(new BN(2)))).to.be.equal(true, 'wrong deposit')

  //       expect(channel.partyABalance.eq(new BN(depositAmount))).to.be.equal(true, 'wrong partyABalance')

  //       expect(channel.stateCounter.eq(new BN(1))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("should set hashed secret for 'partyA'", async function () {
  //       // make a ticket to generate hashedSecret for 'partyA'
  //       const ticket = Ticket({
  //         web3,
  //         accountA: partyA,
  //         accountB: partyB,
  //         signerPrivKey: partyAPrivKey,
  //         porSecretA: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret a' }),
  //         }),
  //         porSecretB: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret b' }),
  //         }),
  //         counterPartySecret: partyASecret2,
  //         amount: web3.utils.toWei('0.2', 'ether'),
  //         counter: 1,
  //         winProbPercent: '100',
  //       })

  //       await hoprChannels.setHashedSecret(ticket.hashedCounterPartySecret, {
  //         from: partyA,
  //       })

  //       const partyAAccount = await hoprChannels.accounts(partyA).then(formatAccount)

  //       expect(partyAAccount.hashedSecret).to.be.equal(ticket.hashedCounterPartySecret, 'wrong hashedSecret')

  //       expect(partyAAccount.counter.eq(new BN(1))).to.be.equal(true, 'wrong counter')
  //     })

  //     it("should set hashed secret for 'partyB'", async function () {
  //       // make a ticket to generate hashedSecret for 'partyB'
  //       const ticket = Ticket({
  //         web3,
  //         accountA: partyA,
  //         accountB: partyB,
  //         signerPrivKey: partyAPrivKey,
  //         porSecretA: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret a' }),
  //         }),
  //         porSecretB: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret b' }),
  //         }),
  //         counterPartySecret: partyBSecret2,
  //         amount: web3.utils.toWei('0.2', 'ether'),
  //         counter: 1,
  //         winProbPercent: '100',
  //       })

  //       await hoprChannels.setHashedSecret(ticket.hashedCounterPartySecret, {
  //         from: partyB,
  //       })

  //       const partyBAccount = await hoprChannels.accounts(partyB).then(formatAccount)

  //       expect(partyBAccount.hashedSecret).to.be.equal(ticket.hashedCounterPartySecret, 'wrong hashedSecret')

  //       expect(partyBAccount.counter.eq(new BN(1))).to.be.equal(true, 'wrong counter')
  //     })

  //     it('should open channel', async function () {
  //       const receipt = await hoprChannels.openChannel(partyB, {
  //         from: partyA,
  //       })

  //       expectEvent.inTransaction(receipt.tx, HoprChannels, 'OpenedChannel', {
  //         opener: partyA,
  //         counterParty: partyB,
  //       })

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.stateCounter.eq(new BN(2))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("'partyA' should reedem winning ticket of 0.2 HOPR", async function () {
  //       const ticket = Ticket({
  //         web3,
  //         accountA: partyA,
  //         accountB: partyB,
  //         signerPrivKey: partyBPrivKey,
  //         porSecretA: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret a' }),
  //         }),
  //         porSecretB: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret b' }),
  //         }),
  //         counterPartySecret: partyASecret2,
  //         amount: web3.utils.toWei('0.2', 'ether'),
  //         counter: 1,
  //         winProbPercent: '100',
  //       })

  //       await hoprChannels.redeemTicket(
  //         ticket.counterPartySecret,
  //         ticket.channelId,
  //         ticket.porSecretA,
  //         ticket.porSecretB,
  //         ticket.amount,
  //         ticket.winProb,
  //         ticket.r,
  //         ticket.s,
  //         ticket.v,
  //         { from: partyA }
  //       )

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.deposit.eq(new BN(depositAmount).mul(new BN(2)))).to.be.equal(true, 'wrong deposit')

  //       expect(
  //         channel.partyABalance.eq(new BN(depositAmount).add(new BN(web3.utils.toWei('0.2', 'ether'))))
  //       ).to.be.equal(true, 'wrong partyABalance')

  //       expect(channel.stateCounter.eq(new BN(2))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("'partyB' should reedem winning ticket of 1.2 HOPR", async function () {
  //       const ticket = Ticket({
  //         web3,
  //         accountA: partyA,
  //         accountB: partyB,
  //         signerPrivKey: partyAPrivKey,
  //         porSecretA: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret a' }),
  //         }),
  //         porSecretB: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret b' }),
  //         }),
  //         counterPartySecret: partyBSecret2,
  //         amount: web3.utils.toWei('1.2', 'ether'),
  //         counter: 1,
  //         winProbPercent: '100',
  //       })

  //       await hoprChannels.redeemTicket(
  //         ticket.counterPartySecret,
  //         ticket.channelId,
  //         ticket.porSecretA,
  //         ticket.porSecretB,
  //         ticket.amount,
  //         ticket.winProb,
  //         ticket.r,
  //         ticket.s,
  //         ticket.v,
  //         { from: partyB }
  //       )

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.deposit.eq(new BN(depositAmount).mul(new BN(2)))).to.be.equal(true, 'wrong deposit')

  //       expect(channel.partyABalance.eq(new BN(0))).to.be.equal(true, 'wrong partyABalance')

  //       expect(channel.stateCounter.eq(new BN(2))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("'partyB' should initiate closure", async function () {
  //       const receipt = await hoprChannels.initiateChannelClosure(partyA, {
  //         from: partyB,
  //       })

  //       expectEvent.inTransaction(receipt.tx, HoprChannels, 'InitiatedChannelClosure', {
  //         initiator: partyB,
  //         counterParty: partyA,
  //       })

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.stateCounter.eq(new BN(3))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("'partyA' should reedem winning ticket of 0.5 HOPR", async function () {
  //       const ticket = Ticket({
  //         web3,
  //         accountA: partyA,
  //         accountB: partyB,
  //         signerPrivKey: partyBPrivKey,
  //         porSecretA: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret a' }),
  //         }),
  //         porSecretB: keccak256({
  //           type: 'bytes32',
  //           value: keccak256({ type: 'string', value: 'por secret b' }),
  //         }),
  //         counterPartySecret: partyASecret1,
  //         amount: web3.utils.toWei('0.5', 'ether'),
  //         counter: 1,
  //         winProbPercent: '100',
  //       })

  //       await hoprChannels.redeemTicket(
  //         ticket.counterPartySecret,
  //         ticket.channelId,
  //         ticket.porSecretA,
  //         ticket.porSecretB,
  //         ticket.amount,
  //         ticket.winProb,
  //         ticket.r,
  //         ticket.s,
  //         ticket.v,
  //         { from: partyA }
  //       )

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.deposit.eq(new BN(depositAmount).mul(new BN(2)))).to.be.equal(true, 'wrong deposit')

  //       expect(channel.partyABalance.eq(new BN(web3.utils.toWei('0.5', 'ether')))).to.be.equal(
  //         true,
  //         'wrong partyABalance'
  //       )

  //       expect(channel.stateCounter.eq(new BN(3))).to.be.equal(true, 'wrong stateCounter')
  //     })

  //     it("'partyA' should close channel", async function () {
  //       await time.increase(time.duration.days(3))

  //       const receipt = await hoprChannels.claimChannelClosure(partyB, {
  //         from: partyA,
  //       })

  //       expectEvent.inTransaction(receipt.tx, HoprChannels, 'ClosedChannel', {
  //         closer: partyA,
  //         counterParty: partyB,
  //         partyAAmount: web3.utils.toWei('0.5', 'ether'),
  //         partyBAmount: web3.utils.toWei('1.5', 'ether'),
  //       })

  //       const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //       expect(channel.deposit.eq(new BN(0))).to.be.equal(true, 'wrong deposit')

  //       expect(channel.partyABalance.eq(new BN(0))).to.be.equal(true, 'wrong partyABalance')

  //       expect(channel.stateCounter.eq(new BN(10))).to.be.equal(true, 'wrong stateCounter')
  //     })
  //   })

  //   context(
  //     "make payments between 'partyA' and 'partyB' using a recycled channel and 'fundChannelWithSig'",
  //     function () {
  //       const partyASecret1 = keccak256({
  //         type: 'bytes32',
  //         value: keccak256({ type: 'string', value: 'partyA secret 2' }),
  //       })
  //       const partyASecret2 = keccak256({
  //         type: 'bytes32',
  //         value: partyASecret1,
  //       })

  //       const partyBSecret1 = keccak256({
  //         type: 'bytes32',
  //         value: keccak256({ type: 'string', value: 'partyB secret 2' }),
  //       })
  //       const partyBSecret2 = keccak256({
  //         type: 'bytes32',
  //         value: partyBSecret1,
  //       })

  //       it("'partyA' and 'partyB' should fund a total of 1 HOPR", async function () {
  //         const totalAmount = web3.utils.toWei('1', 'ether')
  //         const partyAAmount = web3.utils.toWei('0.2', 'ether')
  //         const partyBAmount = web3.utils.toWei('0.8', 'ether')

  //         await hoprToken.approve(hoprChannels.address, totalAmount, {
  //           from: partyA,
  //         })
  //         await hoprToken.approve(hoprChannels.address, totalAmount, {
  //           from: partyB,
  //         })

  //         const notAfter = await time.latest().then((now) => {
  //           return now.add(time.duration.days(2)).toString()
  //         })

  //         const fund = Fund({
  //           web3,
  //           stateCounter: '10',
  //           initiator: partyA,
  //           deposit: totalAmount,
  //           partyAAmount: partyAAmount,
  //           notAfter,
  //           signerPrivKey: partyBPrivKey,
  //         })

  //         const receipt = await hoprChannels.fundChannelWithSig(
  //           '10',
  //           totalAmount,
  //           partyAAmount,
  //           notAfter,
  //           fund.r,
  //           fund.s,
  //           fund.v,
  //           {
  //             from: partyA,
  //           }
  //         )

  //         expectEvent.inTransaction(receipt.tx, HoprChannels, 'FundedChannel', {
  //           // funder: partyA,
  //           recipient: partyA,
  //           counterParty: partyB,
  //           recipientAmount: partyAAmount,
  //           counterPartyAmount: partyBAmount,
  //         })

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.deposit.eq(new BN(totalAmount))).to.be.equal(true, 'wrong deposit')
  //         expect(channel.partyABalance.eq(new BN(partyAAmount))).to.be.equal(true, 'wrong partyABalance')
  //         expect(channel.stateCounter.eq(new BN(11))).to.be.equal(true, 'wrong stateCounter')
  //       })

  //       it("should set hashed secret for 'partyA'", async function () {
  //         // make a ticket to generate hashedSecret for 'partyA'
  //         const ticket = Ticket({
  //           web3,
  //           accountA: partyA,
  //           accountB: partyB,
  //           signerPrivKey: partyAPrivKey,
  //           porSecretA: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret a' }),
  //           }),
  //           porSecretB: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret b' }),
  //           }),
  //           counterPartySecret: partyASecret2,
  //           amount: web3.utils.toWei('0.3', 'ether'),
  //           counter: 2,
  //           winProbPercent: '100',
  //         })

  //         await hoprChannels.setHashedSecret(ticket.hashedCounterPartySecret, {
  //           from: partyA,
  //         })

  //         const partyAAccount = await hoprChannels.accounts(partyA).then(formatAccount)

  //         expect(partyAAccount.hashedSecret).to.be.equal(ticket.hashedCounterPartySecret, 'wrong hashedSecret')

  //         expect(partyAAccount.counter.eq(new BN(2))).to.be.equal(true, 'wrong counter')
  //       })

  //       it("should set hashed secret for 'partyB'", async function () {
  //         // make a ticket to generate hashedSecret for 'partyB'
  //         const ticket = Ticket({
  //           web3,
  //           accountA: partyA,
  //           accountB: partyB,
  //           signerPrivKey: partyAPrivKey,
  //           porSecretA: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret a' }),
  //           }),
  //           porSecretB: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret b' }),
  //           }),
  //           counterPartySecret: partyBSecret2,
  //           amount: web3.utils.toWei('0.7', 'ether'),
  //           counter: 2,
  //           winProbPercent: '100',
  //         })

  //         await hoprChannels.setHashedSecret(ticket.hashedCounterPartySecret, {
  //           from: partyB,
  //         })

  //         const partyBAccount = await hoprChannels.accounts(partyB).then(formatAccount)

  //         expect(partyBAccount.hashedSecret).to.be.equal(ticket.hashedCounterPartySecret, 'wrong hashedSecret')

  //         expect(partyBAccount.counter.eq(new BN(2))).to.be.equal(true, 'wrong counter')
  //       })

  //       it('should open channel', async function () {
  //         const receipt = await hoprChannels.openChannel(partyB, {
  //           from: partyA,
  //         })

  //         expectEvent.inTransaction(receipt.tx, HoprChannels, 'OpenedChannel', {
  //           opener: partyA,
  //           counterParty: partyB,
  //         })

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.stateCounter.eq(new BN(12))).to.be.equal(true, 'wrong stateCounter')
  //       })

  //       it("'partyA' should reedem winning ticket of 0.3 HOPR", async function () {
  //         const ticket = Ticket({
  //           web3,
  //           accountA: partyA,
  //           accountB: partyB,
  //           signerPrivKey: partyBPrivKey,
  //           porSecretA: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret a' }),
  //           }),
  //           porSecretB: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret b' }),
  //           }),
  //           counterPartySecret: partyASecret2,
  //           amount: web3.utils.toWei('0.3', 'ether'),
  //           counter: 2,
  //           winProbPercent: '100',
  //         })

  //         await hoprChannels.redeemTicket(
  //           ticket.counterPartySecret,
  //           ticket.channelId,
  //           ticket.porSecretA,
  //           ticket.porSecretB,
  //           ticket.amount,
  //           ticket.winProb,
  //           ticket.r,
  //           ticket.s,
  //           ticket.v,
  //           { from: partyA }
  //         )

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.deposit.eq(new BN(depositAmount))).to.be.equal(true, 'wrong deposit')

  //         expect(channel.partyABalance.eq(new BN(web3.utils.toWei('0.5', 'ether')))).to.be.equal(
  //           true,
  //           'wrong partyABalance'
  //         )

  //         expect(channel.stateCounter.eq(new BN(12))).to.be.equal(true, 'wrong stateCounter')
  //       })

  //       it("'partyB' should reedem winning ticket of 0.5 HOPR", async function () {
  //         const ticket = Ticket({
  //           web3,
  //           accountA: partyA,
  //           accountB: partyB,
  //           signerPrivKey: partyAPrivKey,
  //           porSecretA: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret a' }),
  //           }),
  //           porSecretB: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret b' }),
  //           }),
  //           counterPartySecret: partyBSecret2,
  //           amount: web3.utils.toWei('0.5', 'ether'),
  //           counter: 2,
  //           winProbPercent: '100',
  //         })

  //         await hoprChannels.redeemTicket(
  //           ticket.counterPartySecret,
  //           ticket.channelId,
  //           ticket.porSecretA,
  //           ticket.porSecretB,
  //           ticket.amount,
  //           ticket.winProb,
  //           ticket.r,
  //           ticket.s,
  //           ticket.v,
  //           { from: partyB }
  //         )

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.deposit.eq(new BN(depositAmount))).to.be.equal(true, 'wrong deposit')

  //         expect(channel.partyABalance.eq(new BN(0))).to.be.equal(true, 'wrong partyABalance')

  //         expect(channel.stateCounter.eq(new BN(12))).to.be.equal(true, 'wrong stateCounter')
  //       })

  //       it("'partyB' should initiate closure", async function () {
  //         const receipt = await hoprChannels.initiateChannelClosure(partyA, {
  //           from: partyB,
  //         })

  //         expectEvent.inTransaction(receipt.tx, HoprChannels, 'InitiatedChannelClosure', {
  //           initiator: partyB,
  //           counterParty: partyA,
  //         })

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.stateCounter.eq(new BN(13))).to.be.equal(true, 'wrong stateCounter')
  //       })

  //       it("'partyA' should reedem winning ticket of 1 HOPR", async function () {
  //         const ticket = Ticket({
  //           web3,
  //           accountA: partyA,
  //           accountB: partyB,
  //           signerPrivKey: partyBPrivKey,
  //           porSecretA: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret a' }),
  //           }),
  //           porSecretB: keccak256({
  //             type: 'bytes32',
  //             value: keccak256({ type: 'string', value: 'por secret b' }),
  //           }),
  //           counterPartySecret: partyASecret1,
  //           amount: web3.utils.toWei('1', 'ether'),
  //           counter: 2,
  //           winProbPercent: '100',
  //         })

  //         await hoprChannels.redeemTicket(
  //           ticket.counterPartySecret,
  //           ticket.channelId,
  //           ticket.porSecretA,
  //           ticket.porSecretB,
  //           ticket.amount,
  //           ticket.winProb,
  //           ticket.r,
  //           ticket.s,
  //           ticket.v,
  //           { from: partyA }
  //         )

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.deposit.eq(new BN(depositAmount))).to.be.equal(true, 'wrong deposit')

  //         expect(channel.partyABalance.eq(new BN(depositAmount))).to.be.equal(true, 'wrong partyABalance')

  //         expect(channel.stateCounter.eq(new BN(13))).to.be.equal(true, 'wrong stateCounter')
  //       })

  //       it("'partyB' should close channel", async function () {
  //         await time.increase(time.duration.days(3))

  //         const receipt = await hoprChannels.claimChannelClosure(partyA, {
  //           from: partyB,
  //         })

  //         expectEvent.inTransaction(receipt.tx, HoprChannels, 'ClosedChannel', {
  //           closer: partyB,
  //           counterParty: partyA,
  //           partyAAmount: web3.utils.toWei('1', 'ether'),
  //           partyBAmount: '0',
  //         })

  //         const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

  //         expect(channel.deposit.eq(new BN(0))).to.be.equal(true, 'wrong deposit')

  //         expect(channel.partyABalance.eq(new BN(0))).to.be.equal(true, 'wrong partyABalance')

  //         expect(channel.stateCounter.eq(new BN(20))).to.be.equal(true, 'wrong stateCounter')
  //       })
  //     }
  //   )
  // })

  // unit tests: reset contracts for every test
  describe('unit tests', function () {
    beforeEach(async function () {
      await reset()
    })

    it('should initialize the on-chain values', async function () {
      const secretHash = keccak256({
        type: 'string',
        value: 'partyB secret',
      })

      const pubKey = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), false).slice(1)

      const response = await hoprChannels.init(
        u8aToHex(pubKey.slice(0, 32), true),
        u8aToHex(pubKey.slice(32, 64), true),
        secretHash
      )

      expectEvent(response, 'SecretHashSet', {
        account: partyB,
        secretHash: secretHash.slice(0, 56),
        counter: '1',
      })
    })

    it('should revert on falsy initialization values', async function () {
      const secretHash = keccak256({
        type: 'string',
        value: 'partyB secret',
      })

      await expectRevert(
        hoprChannels.init(u8aToHex(randomBytes(32), true), u8aToHex(randomBytes(32)), secretHash),
        'Point must be on the curve.'
      )

      const incorrectPubKey = secp256k1.publicKeyCreate(stringToU8a(partyAPrivKey), false).slice(1)

      await expectRevert(
        hoprChannels.init(
          u8aToHex(incorrectPubKey.slice(0, 32), true),
          u8aToHex(incorrectPubKey.slice(32, 64), true),
          secretHash
        ),
        "HoprChannels: Given public key must match 'msg.sender'"
      )

      const pubKey = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), false).slice(1)

      const response = await hoprChannels.init(
        u8aToHex(pubKey.slice(0, 32), true),
        u8aToHex(pubKey.slice(32, 64), true),
        secretHash
      )

      expectEvent(response, 'SecretHashSet', {
        account: partyB,
        secretHash: secretHash.slice(0, 56),
        counter: '1',
      })

      await expectRevert(
        hoprChannels.init(u8aToHex(pubKey.slice(0, 32), true), u8aToHex(pubKey.slice(32, 64), true), secretHash),
        'HoprChannels: Account must not be set.'
      )

      await expectRevert(
        hoprChannels.init('0x', u8aToHex(pubKey.slice(32, 64), true), secretHash),
        'HoprChannels: first component of public key must not be zero.'
      )

      await expectRevert(
        hoprChannels.init(u8aToHex(pubKey.slice(0, 32), true), u8aToHex(pubKey.slice(32, 64), true), '0x'),
        'HoprChannels: HashedSecret must not be empty.'
      )
    })

    it('should have set hashedSecret correctly', async function () {
      const secretHash = keccak256({
        type: 'string',
        value: 'partyB secret',
      })

      const pubKey = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), false).slice(1)

      await expectRevert(
        hoprChannels.setHashedSecret(secretHash, {
          from: partyB,
        }),
        'HoprChannels: msg.sender must have called init() before'
      )

      await hoprChannels.init(u8aToHex(pubKey.slice(0, 32), true), u8aToHex(pubKey.slice(32, 64), true), secretHash)

      await expectRevert(
        hoprChannels.setHashedSecret(secretHash, {
          from: partyB,
        }),
        'HoprChannels: new and old hashedSecrets are the same.'
      )

      const secretHash2 = keccak256({
        type: 'string',
        value: 'partyB secret #2',
      })

      const response = await hoprChannels.setHashedSecret(secretHash2, {
        from: partyB,
      })

      expectEvent(response, 'SecretHashSet', {
        account: partyB,
        secretHash: secretHash2.slice(0, 56),
        counter: '2',
      })
    })

    it("should have funded channel correctly using 'fundChannel'", async function () {
      const secretHashA = keccak256({
        type: 'string',
        value: 'partyA secret',
      })

      const pubKeyA = secp256k1.publicKeyCreate(stringToU8a(partyAPrivKey), false).slice(1)

      await hoprChannels.init(
        u8aToHex(pubKeyA.slice(0, 32), true),
        u8aToHex(pubKeyA.slice(32, 64), true),
        secretHashA,
        {
          from: partyA,
        }
      )

      const secretHashB = keccak256({
        type: 'string',
        value: 'partyA secret',
      })

      const pubKeyB = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), false).slice(1)

      await hoprChannels.init(
        u8aToHex(pubKeyB.slice(0, 32), true),
        u8aToHex(pubKeyB.slice(32, 64), true),
        secretHashB,
        {
          from: partyB,
        }
      )

      const receipt = await hoprToken.send(
        hoprChannels.address,
        depositAmount,
        web3.eth.abi.encodeParameters(['address', 'address'], [partyA, partyB]),
        {
          from: partyA,
        }
      )

      const compressedPubKeyA = secp256k1.publicKeyCreate(stringToU8a(partyAPrivKey), true)
      const compressedPubKeyB = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), true)

      const u8aEvent = stringToU8a(
        keccak256({
          type: 'string',
          value: 'FundedChannel(address,uint,uint,uint,uint)',
        })
      )

      u8aEvent[31] = ((u8aEvent[31] >> 2) << 2) | (compressedPubKeyA[0] % 2 << 1) | compressedPubKeyB[0] % 2

      expect(receipt.receipt.rawLogs[2].topics[0] === u8aToHex(u8aEvent), 'wrong topic0')

      expect(receipt.receipt.rawLogs[2].topics[1] === u8aToHex(compressedPubKeyA.slice(1)), 'wrong first public key')

      expect(receipt.receipt.rawLogs[2].topics[2] === u8aToHex(compressedPubKeyB.slice(1)), 'wrong second public key')

      const channel = await hoprChannels.channels(getChannelId(partyA, partyB)).then(formatChannel)

      expect(channel.deposit.eq(new BN(depositAmount))).to.be.equal(true, 'wrong deposit')

      expect(channel.closureTime.isZero()).to.be.equal(true, 'wrong closureTime')

      expect(channel.stateCounter.eq(new BN(1))).to.be.equal(true, 'wrong stateCounter')
    })

    it("ticket 'signer' should be 'partyA'", async function () {
      const ticket = Ticket({
        web3,
        accountA: partyA,
        accountB: partyB,
        signerPrivKey: partyAPrivKey,
        porSecret: keccak256({
          type: 'bytes32',
          value: keccak256({ type: 'string', value: 'por secret' }),
        }),
        counterPartySecret: keccak256({
          type: 'bytes32',
          value: keccak256({ type: 'string', value: 'partyB secret' }),
        }),
        amount: web3.utils.toWei('0.2', 'ether'),
        counter: 1,
        winProbPercent: '100',
      })

      const signer = recoverSigner(web3, ticket.encodedTicket, ticket.signature)
      expect(signer).to.be.eq(partyA, 'wrong signer')
    })

    it("fund 'signer' should be 'partyA'", async function () {
      const fund = Fund({
        web3,
        stateCounter: '0',
        initiator: partyB,
        deposit: depositAmount,
        partyAAmount: depositAmount,
        notAfter: '0',
        signerPrivKey: partyAPrivKey,
      })

      const signer = recoverSigner(web3, fund.encodedFund, fund.signature)
      expect(signer).to.be.eq(partyA, 'wrong signer')
    })

    it('should fail when creating an open channel a second time', async function () {
      const secretHashA = keccak256({
        type: 'string',
        value: 'partyA secret',
      })

      const pubKeyA = secp256k1.publicKeyCreate(stringToU8a(partyAPrivKey), false).slice(1)

      await hoprChannels.init(
        u8aToHex(pubKeyA.slice(0, 32), true),
        u8aToHex(pubKeyA.slice(32, 64), true),
        secretHashA,
        {
          from: partyA,
        }
      )

      const secretHashB = keccak256({
        type: 'string',
        value: 'partyA secret',
      })

      const pubKeyB = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), false).slice(1)

      await hoprChannels.init(
        u8aToHex(pubKeyB.slice(0, 32), true),
        u8aToHex(pubKeyB.slice(32, 64), true),
        secretHashB,
        {
          from: partyB,
        }
      )

      await hoprToken.send(
        hoprChannels.address,
        depositAmount,
        web3.eth.abi.encodeParameters(['address', 'address'], [partyA, partyB])
      )

      await hoprChannels.openChannel(partyB, {
        from: partyA,
      })

      await expectRevert(
        hoprChannels.openChannel(partyB, {
          from: partyA,
        }),
        `HoprChannels: channel must be in 'FUNDED' state`
      )
    })

    it("should fail 'fundChannel' when token balance too low'", async function () {
      await hoprToken.burn(await hoprToken.balanceOf(partyA), '0x00', {
        from: partyA,
      })

      await expectRevert(
        hoprToken.send(
          hoprChannels.address,
          depositAmount,
          web3.eth.abi.encodeParameters(['address', 'address'], [partyA, partyB]),
          {
            from: partyA,
          }
        ),
        'ERC777: transfer amount exceeds balance'
      )
    })

    it("should fail when 'claimChannelClosure' before closureTime", async function () {
      const secretHashA = keccak256({
        type: 'string',
        value: 'partyA secret',
      })

      const pubKeyA = secp256k1.publicKeyCreate(stringToU8a(partyAPrivKey), false).slice(1)

      await hoprChannels.init(
        u8aToHex(pubKeyA.slice(0, 32), true),
        u8aToHex(pubKeyA.slice(32, 64), true),
        secretHashA,
        {
          from: partyA,
        }
      )

      const secretHashB = keccak256({
        type: 'string',
        value: 'partyA secret',
      })

      const pubKeyB = secp256k1.publicKeyCreate(stringToU8a(partyBPrivKey), false).slice(1)

      await hoprChannels.init(
        u8aToHex(pubKeyB.slice(0, 32), true),
        u8aToHex(pubKeyB.slice(32, 64), true),
        secretHashB,
        {
          from: partyB,
        }
      )
      await hoprToken.send(
        hoprChannels.address,
        depositAmount,
        web3.eth.abi.encodeParameters(['address', 'address'], [partyA, partyB])
      )

      await hoprChannels.openChannel(partyB, {
        from: partyA,
      })

      await hoprChannels.initiateChannelClosure(partyB, {
        from: partyA,
      })

      await expectRevert(
        hoprChannels.claimChannelClosure(partyB, {
          from: partyA,
        }),
        "HoprChannels: 'closureTime' has not passed"
      )
    })
  })
})
