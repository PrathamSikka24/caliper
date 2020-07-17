/*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

const { EventEmitter } = require('events');
const Events = require('./../utils/constants').Events.Connector;

/**
 * Base class for all blockchain connectors
 */
class BlockchainConnector extends EventEmitter {

    /**
     * Constructor
     * @param {number} workerIndex The zero based worker index
     * @param {string} bcType The target SUT type
     */
    constructor(workerIndex, bcType) {
        super();
        this.workerIndex = workerIndex;
        this.bcType = bcType;
    }

    /**
     * Raises the "txsSubmitted" event.
     * @param {number} count The number of TXs submitted. Passed to the raised event.
     * @protected
     */
    _onTxsSubmitted(count) {
        this.emit(Events.TxsSubmitted, count);
    }

    /**
     * Raises the "txsFinished" event.
     * @param {TxStatus|TxStatus[]} txResults The array of TX results. Passed to the raised event.
     * @protected
     */
    _onTxsFinished(txResults) {
        this.emit(Events.TxsFinished, txResults);
    }

    /**
     * Retrieve the target SUT type for this connector
     * @return {string} The target SUT type
     */
    getType() {
        return this.bcType;
    }

    /**
     * Retrieve worker index
     * @return {number} The zero-based worker index
     */
    getWorkerIndex() {
        return this.workerIndex;
    }

    /**
     * Initialize test environment
     * @param {boolean} workerInit Indicates whether the initialization happens in the worker process.
     */
    async init(workerInit) {
        throw new Error('init is not implemented for this blockchain connector');
    }

    /**
     * Install smart contract(s)
     */
    async installSmartContract() {
        throw new Error('installSmartContract is not implemented for this blockchain connector');
    }

    /**
     * Retrieve required arguments for test workers, e.g. retrieve information from the connector that is generated during an admin phase such as contract installation.
     * Information returned here is passed to the worker through the messaging protocol on test.
     * @param {Number} number total count of test workers
     * @return {Promise} array of obtained material for each test worker
     * @async
     */
    async prepareWorkerArguments(number) {
        let result = [];
        for(let i = 0 ; i< number ; i++) {
            result[i] = {}; // as default, return an empty object for each worker
        }
        return result;
    }

    /**
     * Get a connector-specific context object for the workload module of the current round.
     * 'engine' attribute of returned context object must be reserved for benchmark engine to extend the context
     *  engine = {
     *   submitCallback: callback which must be called once new transaction(s) is submitted, it receives a number argument which tells how many transactions are submitted
     * }
     * @param {number} roundIndex The zero-based round index of the test.
     * @param {object} args Connector arguments prepared by the connector in the manager process.
     * @return {Promise<object>} The prepared context object for the workload module.
     * @async
     */
    async getContext(roundIndex, args) {
        throw new Error('getContext is not implemented for this blockchain connector');
    }

    /**
     * Release the current context as well as related resources
     */
    async releaseContext() {
        throw new Error('releaseContext is not implemented for this blockchain connector');
    }

    /**
     * Invoke a smart contract
     * @param {String} contractID identity of the contract
     * @param {String} contractVer version of the contract
     * @param {Object[]} args array of JSON formatted arguments for multiple transactions
     * @param {Number} timeout request timeout, in seconds
     * @return {Promise<TxStatus[]>} The array of data about the executed transactions.
     * @async
     */
    async invokeSmartContract(contractID, contractVer, args, timeout) {
        throw new Error('invokeSmartContract is not implemented for this blockchain connector');
    }

    /**
     * Query state from the ledger using a smart contract
     * @param {String} contractID identity of the contract
     * @param {String} contractVer version of the contract
     * @param {Object[]} args array of JSON formatted arguments
     * @param {Number} timeout request timeout, in seconds
     * @return {Promise<TxStatus[]>} The array of data about the executed queries.
     * @async
     */
    async querySmartContract(contractID, contractVer, args, timeout) {
        throw new Error('querySmartContract is not implemented for this blockchain connector');
    }

    /**
     * Query state from the ledger
     * @param {String} contractID identity of the contract
     * @param {String} contractVer version of the contract
     * @param {String} key lookup key
     * @param {String} fcn The contract query function name
     * @return {Promise<TxStatus[]>} The array of data about the executed queries.
     * @deprecated
     */
    async queryState(contractID, contractVer, key, fcn) {
        throw new Error('queryState is not implemented for this blockchain connector');
    }
}

module.exports = BlockchainConnector;
