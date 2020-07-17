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

const path = require('path');

const {
    BlockchainConnector,
    CaliperUtils,
    ConfigUtil
} = require('@hyperledger/caliper-core');
const installSmartContractImpl = require('./installSmartContract');
const invokeSmartContractImpl = require('./invokeSmartContract');
const generateRawTransactionImpl = require('./generateRawTransactions');
const sendRawTransactionImpl = require('./sendRawTransactions');
const commLogger = CaliperUtils.getLogger('fiscoBcos-connector');

/**
 * Extends {BlockchainConnector} for a FISCO BCOS backend.
 */
class FiscoBcosConnector extends BlockchainConnector {
    /**
     * Create a new instance of the {FISCO BCOS} connector class.
     * @param {number} workerIndex The zero-based index of the worker who wants to create an adapter instance. -1 for the manager process.
     * @param {string} bcType The target SUT type
     */
    constructor(workerIndex, bcType) {
        super(workerIndex, bcType);
        this.workspaceRoot = path.resolve(ConfigUtil.get(ConfigUtil.keys.Workspace));
        let networkConfig = CaliperUtils.resolvePath(ConfigUtil.get(ConfigUtil.keys.NetworkConfig));
        this.fiscoBcosSettings = CaliperUtils.parseYaml(networkConfig)['fisco-bcos'];

        if (this.fiscoBcosSettings.network && this.fiscoBcosSettings.network.authentication) {
            for (let k in this.fiscoBcosSettings.network.authentication) {
                this.fiscoBcosSettings.network.authentication[k] = CaliperUtils.resolvePath(this.fiscoBcosSettings.network.authentication[k]);
            }
        }
        this.clientIdx = workerIndex;
        this.context = undefined;
    }

    /**
     * Initialize the {FISCO BCOS} object.
     * @async
     * @return {Promise<object>} The promise for the result of the execution.
     */
    async init() {
        return Promise.resolve();
    }

    /**
     * Deploy the smart contract specified in the network configuration file to all nodes.
     * @async
     */
    async installSmartContract() {
        const fiscoBcosSettings = this.fiscoBcosSettings;
        try {
            await installSmartContractImpl.run(fiscoBcosSettings, this.workspaceRoot);
        } catch (error) {
            commLogger.error(`FISCO BCOS smart contract install failed: ${(error.stack ? error.stack : error)}`);
            throw error;
        }
    }

    /**
     * Get a context for subsequent operations
     * 'engine' attribute of returned context object must be reserved for benchmark engine to extend the context
     *  engine = {
     *   submitCallback: callback which must be called once new transaction(s) is submitted, it receives a number argument which tells how many transactions are submitted
     * }
     * @param {Number} roundIndex The zero-based round index of the test.
     * @param {Object} args adapter specific arguments
     * @return {Promise<object>} The promise for the result of the execution.
     */
    async getContext(roundIndex, args) {
        this.context = {};
        return this.context;
    }

    /**
     * Release a context as well as related resources
     * @return {Promise<object>} The promise for the result of the execution.
     */
    async releaseContext() {
        this.context = undefined;
    }

    /**
     * Invoke the given smart contract according to the specified options. Multiple transactions will be generated according to the length of args.
     * @param {string} contractID The name of the smart contract.
     * @param {string} contractVer The version of the smart contract.
     * @param {Object | Array<Object>} invokeData Array of JSON formatted arguments for transaction(s). Each element contains arguments (including the function name) passing to the smart contract. JSON attribute named transaction_type is used by default to specify the function name. If the attribute does not exist, the first attribute will be used as the function name.
     * @param {number} timeout The timeout to set for the execution in seconds.
     * @return {Promise<object>} The promise for the result of the execution.
     */
    async invokeSmartContract(contractID, contractVer, invokeData, timeout) {
        let promises = [];

        let invocations;
        if (!Array.isArray(invokeData)) {
            invocations = [invokeData];
        } else {
            invocations = invokeData;
        }

        try {
            invocations.forEach((arg) => {
                let fcn = null;
                let fcArgs = [];

                for (let key in arg) {
                    if (key === 'transaction_type') {
                        fcn = arg[key].toString();
                    } else {
                        fcArgs.push(arg[key].toString());
                    }
                }

                this._onTxsSubmitted(1);
                promises.push(invokeSmartContractImpl.run(this.fiscoBcosSettings, contractID, fcn, fcArgs, this.workspaceRoot));
            });

            const results = await Promise.all(promises);
            this._onTxsFinished(results);
            return results;
        } catch (error) {
            commLogger.error(`FISCO BCOS smart contract invoke failed: ${(error.stack ? error.stack : JSON.stringify(error))}`);
            throw error;
        }
    }

    /**
     * Query state from the ledger
     * @param {String} contractID Identity of the contract
     * @param {String} contractVer Version of the contract
     * @param {String} key lookup key
     * @param {String} fcn The smart contract query function name
     * @return {Promise<object>} The result of the query.
     */
    async queryState(contractID, contractVer, key, fcn) {
        try {
            this._onTxsSubmitted(1);
            const result = await invokeSmartContractImpl.run(this.fiscoBcosSettings, contractID, fcn, key, this.workspaceRoot, true);
            this._onTxsFinished(result);
            return result;
        } catch (error) {
            commLogger.error(`FISCO BCOS smart contract query failed: ${(error.stack ? error.stack : error)}`);
            throw error;
        }
    }

    /**
     * Generate an raw transaction and store in local file
     * @param {String} contractID Identity of the contract
     * @param {Object} arg Arguments of the transaction
     * @param {String} file File path which will be used to store then transaction
     * @return {TaskStatus} Indicates whether the transaction is written to the file successfully or not
     */
    async generateRawTransaction(contractID, arg, file) {
        this._onTxsSubmitted(1);
        const result = await generateRawTransactionImpl.run(this.fiscoBcosSettings, this.workspaceRoot, contractID, arg, file);
        this._onTxsFinished(result);
        return result;
    }

    /**
     * Send raw transactions
     * @param {Object} context The FISCO BCOS context returned by {getContext}
     * @param {Array} transactions List of raw transactions
     * @return {Promise} The promise for the result of the execution
     */
    async sendRawTransaction(context, transactions) {
        return sendRawTransactionImpl.run(this.fiscoBcosSettings, transactions, this._onTxsSubmitted, this._onTxsFinished);
    }
}

module.exports = FiscoBcosConnector;
