const { getEventArgument, injectWeb3, injectArtifacts } = require('@1hive/contract-helpers-test')
const { EMPTY_CALLS_SCRIPT, newDao, installNewApp } = require('@1hive/contract-helpers-test/src/aragon-os')
const { assertRevert, assertBn } = require('@1hive/contract-helpers-test/src/asserts')
const { utils } = require('ethers')
const { ARAGON_OS_ERRORS, BATCHER_ERRORS } = require('./helpers/errors')

injectWeb3(web3)
injectArtifacts(artifacts)

const Batcher = artifacts.require('Batcher')

contract('Batcher', ([anyone, owner]) => {

  let batcherBase, batcher
  let ADD_SCRIPT_ROLE, AUTHORIZE_SCRIPT_ROLE, EXECUTE_SCRIPT_ROLE


  const APP_ID = '0x1234123412341234123412341234123412341234123412341234123412341234'

  before('load roles', async () => {
    batcherBase = await Batcher.new()
    ADD_SCRIPT_ROLE = await batcherBase.ADD_SCRIPT_ROLE()
    AUTHORIZE_SCRIPT_ROLE = await batcherBase.AUTHORIZE_SCRIPT_ROLE()
    EXECUTE_SCRIPT_ROLE = await batcherBase.EXECUTE_SCRIPT_ROLE()
  })


  beforeEach('deploy voting', async () => {
    const { dao, acl } = await newDao(owner)
    batcher = await Batcher.at(await installNewApp(dao, APP_ID, batcherBase.address,  owner))

    await acl.createPermission(owner, batcher.address, ADD_SCRIPT_ROLE, owner, { from: owner })
    await acl.createPermission(owner, batcher.address, AUTHORIZE_SCRIPT_ROLE, owner, { from: owner })
    await acl.createPermission(owner, batcher.address, EXECUTE_SCRIPT_ROLE, owner, { from: owner })

  })

  describe('initialize', () => {
    it('cannot initialize base app', async () => {
      assert.isTrue(await batcherBase.isPetrified(), 'batcher base is not petrified')
      await assertRevert(batcherBase.initialize(), ARAGON_OS_ERRORS.INIT_ALREADY_INITIALIZED)
    })

    context('when the app was not initialized', () => {
      it('is not initialized', async () => {
        assert.isFalse(await batcher.hasInitialized(), 'voting is initialized')
      })
      
      it('cannot be initialized twice', async () => {
        await batcher.initialize();
        await assertRevert(batcher.initialize(), ARAGON_OS_ERRORS.INIT_ALREADY_INITIALIZED)
      })
    })
  })

  describe("addScript", () => {
    beforeEach(async function () {
      await batcher.initialize()
    });

    it("should add an script with correct data and dependencies", async function () {
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [], { from: owner })
      const script = await batcher.scripts(0)
      const dependencies = await batcher.getDependencies(0)
      assert.equal(script[0], utils.keccak256(EMPTY_CALLS_SCRIPT), "script is not correct")
      assertBn(script[1], 0, "state is not correct")
      assert.deepEqual(dependencies, [], "dependencies are not correct")
    });

    it("should emit AddScript event when an script is added", async function () {
      const receipt = await batcher.addScript(EMPTY_CALLS_SCRIPT, [], { from: owner })
      const scriptId = getEventArgument(receipt, 'AddScript', 'scriptId')
      const script = getEventArgument(receipt, 'AddScript', 'script')
      const dependencies = getEventArgument(receipt, 'AddScript', 'dependencies')

      assertBn(scriptId, 0, "event is not correct")
      assert.equal(script, EMPTY_CALLS_SCRIPT, "script is not correct")
      assert.equal(dependencies.length, 0, "dependencies length is not correct")
    });

    it("should revert if the sender doesn't have ADD_SCRIPT_ROLE", async function () {
      await assertRevert(batcher.addScript(EMPTY_CALLS_SCRIPT, [], { from: anyone }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
    });

    it("should revert if the dependencies do not exist yet", async function () {
      await assertRevert(batcher.addScript(EMPTY_CALLS_SCRIPT, [0], { from: owner }), BATCHER_ERRORS.BATCHER_NO_SCRIPT)
    });
  });

  describe("forward", () => {
    beforeEach(async function () {
      await batcher.initialize()
    });

    it("should add an script with correct data", async function () {
      await batcher.forward(EMPTY_CALLS_SCRIPT, { from: owner })
      const script = await batcher.scripts(0)
      const dependencies = await batcher.getDependencies(0)
      assert.equal(script[0], utils.keccak256(EMPTY_CALLS_SCRIPT), "script is not correct")
      assertBn(script[1], 0, "state is not correct")
      assert.deepEqual(dependencies, [], "dependencies are not correct")
    });

    it("should emit AddScript event when an script is forwarded", async function () {
      const receipt = await batcher.forward(EMPTY_CALLS_SCRIPT, { from: owner })
      const scriptId = getEventArgument(receipt, 'AddScript', 'scriptId')
      const script = getEventArgument(receipt, 'AddScript', 'script')
      const dependencies = getEventArgument(receipt, 'AddScript', 'dependencies')

      assertBn(scriptId, 0, "event is not correct")
      assert.equal(script, EMPTY_CALLS_SCRIPT, "script is not correct")
      assert.equal(dependencies.length, 0, "dependencies length is not correct")
    });

    it("should revert if the sender doesn't have ADD_SCRIPT_ROLE", async function () {
      await assertRevert(batcher.forward(EMPTY_CALLS_SCRIPT, { from: anyone }), BATCHER_ERRORS.BATCHER_CAN_NOT_FORWARD)
    });
  });

  describe("authorizeScript", () => {
    beforeEach(async function () {
      await batcher.initialize()
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [], { from: owner })
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [0], { from: owner })
    });

    it("should authorize an script correctly", async function () {
      await batcher.authorizeScript(1, { from: owner })
      const script = await batcher.scripts(1)
      const authorizedState = 1
      assertBn(script[1], authorizedState, "state is not correct")
    });

    it("should emit AuthorizeScript event when an script is authorized", async function () {
      const receipt = await batcher.authorizeScript(1, { from: owner })
      const scriptId = getEventArgument(receipt, 'AuthorizeScript', 'scriptId')
      assert.equal(scriptId, 1, "event is not correct")
    });

    it("should revert if the sender doesn't have AUTHORIZE_SCRIPT_ROLE", async function () {
      await assertRevert(batcher.authorizeScript(1, { from: anyone }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
    });

    it("should not authorize an script that has already been authorized", async function () {
      await batcher.authorizeScript(1, { from: owner })
      await assertRevert(batcher.authorizeScript(1, { from: owner }), BATCHER_ERRORS.BATCHER_SCRIPT_ALREADY_AUTHORIZED)
    });

    it("should revert if the script does not exist", async function () {
      await assertRevert(batcher.authorizeScript(2, { from: owner }), BATCHER_ERRORS.BATCHER_NO_SCRIPT)
    });
  });

  describe("executeScript", function () {
    beforeEach(async function () {
      await batcher.initialize()
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [], { from: owner })
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [0], { from: owner })
    });

    it("should execute an authorized script correctly", async function () {
      await batcher.authorizeScript(0, { from: owner })
      await batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: owner })
    });

    it("should emit ExecuteScript event when an script is executed", async function () {
      await batcher.authorizeScript(0, { from: owner })
      const receipt = await batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: owner })
      const scriptId = getEventArgument(receipt, 'ExecuteScript', 'scriptId')
      assert.equal(scriptId, 0, "event is not correct")
    });

    it("should revert if the sender doesn't have EXECUTE_SCRIPT_ROLE", async function () {
      await batcher.authorizeScript(0, { from: owner })
      await assertRevert(batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: anyone }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
    });

    it("should not execute an script with invalid EVM script", async function () {
      await batcher.authorizeScript(0, { from: owner })
      const INVALID_EVM_SCRIPT = "0x00000002"
      await assertRevert(batcher.executeScript(0, INVALID_EVM_SCRIPT, { from: owner }), BATCHER_ERRORS.BATCHER_INVALID_EVM_SCRIPT)
    });

    it("should not execute an unauthorized script", async function () {
      await assertRevert(batcher.executeScript(1, EMPTY_CALLS_SCRIPT, { from: owner }), BATCHER_ERRORS.BATCHER_SCRIPT_NOT_AUTHORIZED)
    });

    it("should not execute an script that has already been executed", async function () {
      await batcher.authorizeScript(0, { from: owner })
      await batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: owner })
      await assertRevert(batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: owner }), BATCHER_ERRORS.BATCHER_SCRIPT_ALREADY_EXECUTED)
    });

    it("should revert if the script does not exist", async function () {
      await assertRevert(batcher.executeScript(2, EMPTY_CALLS_SCRIPT, { from: owner }), BATCHER_ERRORS.BATCHER_NO_SCRIPT)
    });

    context('when the script has dependencies', () => {
      it("should not execute an script if its dependencies have not been executed", async function () {
        await batcher.authorizeScript(0, { from: owner })
        await batcher.authorizeScript(1, { from: owner })
        await assertRevert(batcher.executeScript(1, EMPTY_CALLS_SCRIPT, { from: owner }), BATCHER_ERRORS.BATCHER_SCRIPT_DEPENDENCIES_NOT_MET)
      });

      it("should execute an script if its dependencies have been executed", async function () {
        await batcher.addScript(EMPTY_CALLS_SCRIPT, [1], { from: owner })

        await batcher.authorizeScript(0, { from: owner })
        await batcher.authorizeScript(1, { from: owner })
        await batcher.authorizeScript(2, { from: owner })
        
        await batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: owner })
        await batcher.executeScript(1, EMPTY_CALLS_SCRIPT, { from: owner })
        await batcher.executeScript(2, EMPTY_CALLS_SCRIPT, { from: owner })
      });
    });
  });

  describe("canForward", () => {
    beforeEach(async function () {
      await batcher.initialize()
    });

    it("should return true if the sender has ADD_SCRIPT_ROLE", async function () {
      const canForward = await batcher.canForward(owner, EMPTY_CALLS_SCRIPT)
      assert.isTrue(canForward, "canForward should be true")
    });

    it("should return false if the sender doesn't have ADD_SCRIPT_ROLE", async function () {
      const canForward = await batcher.canForward(anyone, EMPTY_CALLS_SCRIPT)
      assert.isFalse(canForward, "canForward should be false")
    });
  });

  describe("isForwarder", () => {
    beforeEach(async function () {
      await batcher.initialize()
    });

    it("should return true", async function () {
      const isForwarder = await batcher.isForwarder()
      assert.isTrue(isForwarder, "isForwarder should be true")
    });
  });

  describe("canExecute", () => {
    beforeEach(async function () {
      await batcher.initialize()
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [], { from: owner })
      await batcher.addScript(EMPTY_CALLS_SCRIPT, [0], { from: owner })
    });

    it("should return true if the sender has EXECUTE_SCRIPT_ROLE", async function () {
      await batcher.authorizeScript(0, { from: owner })
      const canExecute = await batcher.canExecute(owner, 0)
      assert.isTrue(canExecute, "canExecute should be true")
    });

    it("should return false if the sender doesn't have EXECUTE_SCRIPT_ROLE", async function () {
      await batcher.authorizeScript(0, { from: owner })
      const canExecute = await batcher.canExecute(anyone, 0)
      assert.isFalse(canExecute, "canExecute should be false")
    });

    it("should return false if the script is not authorized", async function () {
      const canExecute = await batcher.canExecute(owner, 0)
      assert.isFalse(canExecute, "canExecute should be false")
    });

    it("should return false if the script has already been executed", async function () {
      await batcher.authorizeScript(0, { from: owner })
      await batcher.executeScript(0, EMPTY_CALLS_SCRIPT, { from: owner })
      const canExecute = await batcher.canExecute(owner, 0)
      assert.isFalse(canExecute, "canExecute should be false")
    });

    it("should return false if the script has unmet dependencies", async function () {
      await batcher.authorizeScript(0, { from: owner })
      await batcher.authorizeScript(1, { from: owner })
      const canExecute = await batcher.canExecute(owner, 1)
      assert.isFalse(canExecute, "canExecute should be false")
    });
  });
})