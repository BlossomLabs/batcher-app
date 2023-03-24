const { getInstalledApp } = require('@1hive/contract-helpers-test/src/aragon-os')
const { getEventArgument } = require('@1hive/contract-helpers-test')


const DEFAULT_BATCHER_INITIALIZATION_PARAMS = {
  appId: '0x1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe',
}

class BatcherDeployer {
  constructor(artifacts, web3) {
    this.web3 = web3
    this.artifacts = artifacts
    this.previousDeploy = {}
  }

  get owner() {
    return this.previousDeploy.owner
  }

  get dao() {
    return this.previousDeploy.dao
  }

  get acl() {
    return this.previousDeploy.acl
  }

  get base() {
    return this.previousDeploy.base
  }

  get batcher() {
    return this.previousDeploy.batcher
  }

  get abi() {
    return this.base.abi
  }

  async deployAndInitialize(options = {}) {
    await this.deploy(options)

    await this.batcher.initialize()

    return this.batcher
  }

  async deploy(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase(options)

    const { appId } = { ...DEFAULT_BATCHER_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.base.address, '0x', false, { from: owner })
    const batcher = await this.base.constructor.at(await getInstalledApp(receipt, appId))

    const restrictedPermissions = ['ADD_SCRIPT_ROLE', 'AUTHORIZE_SCRIPT_ROLE', 'EXECUTE_SCRIPT_ROLE']
    await this._createPermissions(batcher, restrictedPermissions, owner)
    console.log('permissions set to ', owner)

    this.previousDeploy = { ...this.previousDeploy, batcher }
    return batcher
  }

  async deployBase() {
    const Batcher = this._getContract('Batcher')
    const base = await Batcher.new()
    this.previousDeploy = { ...this.previousDeploy, base }
    return base
  }

  async deployDAO(owner) {
    const Kernel = this._getContract('Kernel')
    const kernelBase = await Kernel.new(true)

    const ACL = this._getContract('ACL')
    const aclBase = await ACL.new()

    const EVMScriptRegistryFactory = this._getContract('EVMScriptRegistryFactory')
    const regFact = await EVMScriptRegistryFactory.new()

    const DAOFactory = this._getContract('DAOFactory')
    const daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)

    const kernelReceipt = await daoFact.newDAO(owner)
    const dao = await Kernel.at(getEventArgument(kernelReceipt, 'DeployDAO', 'dao'))
    const acl = await ACL.at(await dao.acl())

    const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })

    this.previousDeploy = { ...this.previousDeploy, dao, acl, owner }
    return dao
  }

  async _createPermissions(app, permissions, to, manager = to) {
    for (const permission of permissions) {
      const ROLE = await app[permission]()
      await this.acl.createPermission(to, app.address, ROLE, manager, { from: manager })
    }
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }

  async _getSender() {
    const accounts = await this.web3.eth.getAccounts()
    return accounts[0]
  }
}

module.exports = (web3, artifacts) => new BatcherDeployer(artifacts, web3)
