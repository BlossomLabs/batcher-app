Batcher
=====

Batcher is an Aragon App designed to reduce the number of votes that need to be sent to a DAO.

Voting on numerous proposals can be expensive and time-consuming, especially when transactions are required for each vote.

With Batcher, users can authorize thousands of transactions in one single vote, allowing for the efficient management and execution of dependent actions in a more organized and secure way.

This significantly optimizes the voting process, reducing the number of transactions and making the overall governance process more efficient.

#### 🐲 Project Stage: Development

The Batcher app is published to `batcher.open.aragonpm.eth` on xDAI network. If you experience any issues or are interested in contributing please see review our [open issues](https://github.com/BlossomLabs/batcher-app).

#### 🚨 Security Review Status: pre-audit

The code in this repository has not been audited.

## Initialization

The Batcher app doesn't need parameters to initialize.

## Roles

The Batcher app implements the following roles:

* **ADD_SCRIPT_ROLE**: Allows adding new (dependent or independent) scripts.
* **AUTHORIZE_SCRIPT_ROLE**: Allows authorizing scripts for execution.
* **EXECUTE_SCRIPT_ROLE**: Allows executing authorized scripts, ensuring all dependencies have been executed.

The Batcher app should have permissions to call the actions within the scripts that are added to the batcher.

## Interface

The Batcher app doesn't implement a specific front end.

## Disclaimer
Batcher is an open source app. None of the people or institutions involved in its development may be held accountable for how it is used. If you do use it please make sure you comply to the jurisdictions you may be jubjected to.