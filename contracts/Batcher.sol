pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";


contract Batcher is AragonApp, IForwarder {

    bytes32 public constant ADD_SCRIPT_ROLE = keccak256("ADD_SCRIPT_ROLE");
    bytes32 public constant AUTHORIZE_SCRIPT_ROLE = keccak256("AUTHORIZE_SCRIPT_ROLE");
    bytes32 public constant EXECUTE_SCRIPT_ROLE = keccak256("EXECUTE_SCRIPT_ROLE");

    string private constant ERROR_NO_SCRIPT = "BATCHER_NO_SCRIPT";
    string private constant ERROR_INVALID_EXECUTION_SCRIPT = "BATCHER_INVALID_EXECUTION_SCRIPT";
    string private constant ERROR_SCRIPT_ALREADY_AUTHORIZED = "BATCHER_SCRIPT_ALREADY_AUTHORIZED";
    string private constant ERROR_CANNOT_EXECUTE_SCRIPT = "BATCHER_CANNOT_EXECUTE_SCRIPT";
    string private constant ERROR_CAN_NOT_FORWARD = "BATCHER_CAN_NOT_FORWARD";

    enum ScriptState {
        Pending,     // Script has been added and has its ID
        Authorized,  // Script has been authorized and anyone can execute it
        Executed     // Script has been executed
    }

    struct Script {
        bytes32 scriptHash;
        ScriptState state;
        uint256[] dependencies;
    }

    mapping(uint256 => Script) public scripts;
    uint256 scriptsLength;

    event AddScript (uint256 scriptId, bytes script, uint256[] dependencies);
    event AuthorizeScript (uint256 scriptId);
    event ExecuteScript (uint256 scriptId);

    /***** external function *****/

    /**
     * @notice Initialize batcher
    */
    function initialize(
    )
        external
        onlyInit
    {
        initialized();
    }

    /**
     * @notice Add script with optional dependencies
     * @param _evmScript EVM script to be executed
     * @param _dependencies Array of script IDs that must be executed before this script
     * @return scriptId Script ID
    */
    function addScript(bytes _evmScript, uint256[] _dependencies) external auth(ADD_SCRIPT_ROLE) returns (uint256 scriptId) {
        for (uint256 i = 0; i < _dependencies.length; i++) {
            require(_dependencies[i] < scriptsLength, ERROR_NO_SCRIPT);
        }
        return _addScriptUnsafe(_evmScript, _dependencies);
    }

    /**
     * @notice Authorize script #`_scriptId`
     * @param _scriptId Script ID
    */
    function authorizeScript(uint256 _scriptId) external auth(AUTHORIZE_SCRIPT_ROLE) {
        Script storage script = _getScript(_scriptId);
        require(script.state == ScriptState.Pending, ERROR_SCRIPT_ALREADY_AUTHORIZED);
        script.state = ScriptState.Authorized;
        emit AuthorizeScript(_scriptId);
    }

    /**
     * @notice Execute script #`_scriptId`
     * @param _scriptId Script ID
     * @param _evmScript EVM script to be executed
    */
    function executeScript(uint256 _scriptId, bytes _evmScript) external auth(EXECUTE_SCRIPT_ROLE) {
        Script storage script = _getScript(_scriptId);
        require(_isExecutable(script), ERROR_CANNOT_EXECUTE_SCRIPT);
        require(keccak256(_evmScript) == scripts[_scriptId].scriptHash, ERROR_INVALID_EXECUTION_SCRIPT);

        scripts[_scriptId].state = ScriptState.Executed;

        runScript(_evmScript, new bytes(0), new address[](0));
        emit ExecuteScript(_scriptId);
    }

    /**
     * @notice Get dependencies for script #`_scriptId`
     * @param _scriptId Script ID
     */
    function getDependencies(uint256 _scriptId) external view returns (uint256[]) {
        return scripts[_scriptId].dependencies;
    }

    /**
    * @dev Tell if a script can be executed
    * @param _sender Address of the user trying to execute the script
    * @param _scriptId Identification number of the vote being queried
    * @return True if the script can be executed
    */
    function canExecute(address _sender, uint256 _scriptId) external view returns (bool) {
        if (!canPerform(_sender, EXECUTE_SCRIPT_ROLE, arr())) {
            return false;
        }
        return _isExecutable(_getScript(_scriptId));
    }

    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);
        _addScriptUnsafe(_evmScript, new uint256[](0));
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        return canPerform(_sender, ADD_SCRIPT_ROLE, arr());
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }

    /***** internal function *****/

    /**
    * @dev Add script without checking for dependencies
    * @param _evmScript EVM script to be executed
    * @param _dependencies Array of script IDs that must be executed before this script
    * @return scriptId Script ID
    */
    function _addScriptUnsafe(bytes _evmScript, uint256[] _dependencies) internal returns (uint256 scriptId) {
        scriptId = scriptsLength++;
        scripts[scriptId] = Script({
            scriptHash: keccak256(_evmScript),
            state: ScriptState.Pending,
            dependencies: _dependencies
        });
        emit AddScript(scriptId, _evmScript, _dependencies);
    }

    /**
    * @dev Fetch an script instance by identification number
    * @param _scriptId Identification number of the script
    * @return Script instance
    */
    function _getScript(uint256 _scriptId) internal view returns (Script storage) {
        require(_scriptId < scriptsLength, ERROR_NO_SCRIPT);
        return scripts[_scriptId];
    }

    /**
    * @dev Tell if an script can be executed
    * @param _script Script instance being queried
    * @return True if the script can be executed
    */
    function _isExecutable(Script storage _script) internal view returns (bool) {
        if (_script.state != ScriptState.Authorized) {
            return false;
        }
        for (uint256 i; i < _script.dependencies.length; ++i) {
            if (scripts[_script.dependencies[i]].state != ScriptState.Executed) {
                return false;
            }
        }
        return true;
    }
}