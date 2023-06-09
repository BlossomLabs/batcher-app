const ARAGON_OS_ERRORS = {
    APP_AUTH_FAILED: 'APP_AUTH_FAILED',
    INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
    INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
    RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',
    EVMCALLS_INVALID_LENGTH: 'EVMCALLS_INVALID_LENGTH'
  }
  
  const BATCHER_ERRORS = {
    // Validation
    BATCHER_NO_SCRIPT: 'BATCHER_NO_SCRIPT',
    BATCHER_INVALID_EXECUTION_SCRIPT: 'BATCHER_INVALID_EXECUTION_SCRIPT',
    BATCHER_SCRIPT_ALREADY_AUTHORIZED: 'BATCHER_SCRIPT_ALREADY_AUTHORIZED',
    BATCHER_CANNOT_EXECUTE_SCRIPT: 'BATCHER_CANNOT_EXECUTE_SCRIPT',
    BATCHER_CAN_NOT_FORWARD: 'BATCHER_CAN_NOT_FORWARD',
  }
  
  module.exports = {
    ARAGON_OS_ERRORS,
    BATCHER_ERRORS
  }
  