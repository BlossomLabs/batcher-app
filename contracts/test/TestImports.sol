pragma solidity 0.4.24;

import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/factory/EVMScriptRegistryFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";


// HACK to workaround truffle artifact loading on dependencies
contract TestImports {
    constructor() public {
        // solium-disable-previous-line no-empty-blocks
    }
}
