import { network } from "hardhat";
import { describe, it } from "node:test";
import { expect } from "chai";

const { viem, networkHelpers } = await network.connect();
const [owner, alice, bob] = await viem.getWalletClients();

describe("Distribute ERC20", async () => {
    const amountForAlice = 100n;
    const amountForBob = 200n;
    const totalAmount = amountForAlice + amountForBob;

    async function deployFixtures() {
        const distributor = await viem.deployContract("Distributor", [owner.account.address]);
        const token = await viem.deployContract("ERC20Mock", ["USDC", "USDC"]);

        await token.write.mint([owner.account.address, totalAmount]);
        await token.write.approve([distributor.address, totalAmount]);

        return { distributor, token };
    }

    it("Should distribute tokens to multiple receivers", async () => {
        const { distributor, token } = await networkHelpers.loadFixture(deployFixtures);

        await distributor.write.distributeERC20([
            token.address,
            [alice.account.address, bob.account.address],
            [amountForAlice, amountForBob]
        ]);

        expect(await token.read.balanceOf([alice.account.address])).to.equal(amountForAlice);
        expect(await token.read.balanceOf([bob.account.address])).to.equal(amountForBob);
        expect(await token.read.balanceOf([owner.account.address])).to.equal(0n);
    })

    it("Should fail when allowance is not enough", async () => {
        const { distributor, token } = await networkHelpers.loadFixture(deployFixtures);

        await token.write.approve([distributor.address, totalAmount - 1n]);

        await viem.assertions.revertWith(
            distributor.write.distributeERC20([
                token.address,
                [alice.account.address, bob.account.address],
                [amountForAlice, amountForBob]
            ]),
            "Insufficient allowance granted to contract."
        );
    })

    it("Should fail when called by non-owner", async () => {
        const { distributor, token } = await networkHelpers.loadFixture(deployFixtures);

        await viem.assertions.revertWithCustomError(
            distributor.write.distributeERC20([
                token.address,
                [alice.account.address, bob.account.address],
                [amountForAlice, amountForBob]
            ], { account: alice.account }),
            distributor,
            "OwnableUnauthorizedAccount"
        );

        expect(await token.read.balanceOf([alice.account.address])).to.equal(0n);
        expect(await token.read.balanceOf([bob.account.address])).to.equal(0n);
        expect(await token.read.balanceOf([owner.account.address])).to.equal(totalAmount);
    })

    it("Should fail when number of receivers does not match the number of amounts", async () => {
        const { distributor, token } = await networkHelpers.loadFixture(deployFixtures);

        await viem.assertions.revertWith(
            distributor.write.distributeERC20([
                token.address,
                [alice.account.address, bob.account.address],
                [amountForAlice]
            ]),
            "Receivers and amounts must have the same length."
        );
    })
});

describe("Distribute native coins", async () => {
    const amountForAlice = 100n;
    const amountForBob = 200n;

    async function deployFixtures() {
        const distributor = await viem.deployContract("Distributor", [owner.account.address]);

        return distributor;
    }

    it("Should distribute tokens to multiple receivers", async () => {
        const distributor = await networkHelpers.loadFixture(deployFixtures);

        await viem.assertions.balancesHaveChanged(
            distributor.write.distributeNative(
                [
                    [alice.account.address, bob.account.address],
                    [amountForAlice, amountForBob]
                ],
                { value: amountForAlice + amountForBob }
            ),
            [
                { address: alice.account.address, amount: amountForAlice },
                { address: bob.account.address, amount: amountForBob }
            ]
        );
    })

    it("Should fail when transfered value does not match the total amount", async () => {
        const distributor = await networkHelpers.loadFixture(deployFixtures);

        let values = [0n, amountForAlice, amountForAlice + amountForBob + 100n];

        for (let value of values) {
            await viem.assertions.revertWith(
                distributor.write.distributeNative(
                    [
                        [alice.account.address, bob.account.address],
                        [amountForAlice, amountForBob]
                    ],
                    { value }
                ),
                "Attached value does not match the total amount."
            );
        }
    })

    it("Should fail when called by non-owner", async () => {
        const distributor = await networkHelpers.loadFixture(deployFixtures);

        await viem.assertions.revertWithCustomError(
            distributor.write.distributeNative(
                [
                    [alice.account.address, bob.account.address],
                    [amountForAlice, amountForBob]
                ],
                {
                    value: amountForAlice + amountForBob,
                    account: alice.account
                }
            ),
            distributor,
            "OwnableUnauthorizedAccount"
        );
    })

    it("Should fail when number of receivers does not match the number of amounts", async () => {
        const distributor = await networkHelpers.loadFixture(deployFixtures);

        await viem.assertions.revertWith(
            distributor.write.distributeNative(
                [
                    [alice.account.address, bob.account.address],
                    [amountForAlice]
                ],
                { value: amountForAlice + amountForBob }
            ),
            "Receivers and amounts must have the same length."
        );
    })
});