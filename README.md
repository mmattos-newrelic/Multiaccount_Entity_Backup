# Multiaccount_Entity_Backup
Sample code to back up entities from subaccount

This code was built using Node.js,

You must execute all the project files in the same directory (you can create it wherever you want),

The 'accounts_keys.csv' file will host the account numbers and account API keys of all the accounts that you want to collect data from.

What do you need? Access to a New Relic account with the "integration management" permission and:
node.js v22.19.0 npm (local)
corepack@0.34.0
crypto@1.0.1
csv-parse@6.1.0
csv-stringify@6.6.0
esm@3.2.25
fs@0.0.1-security
got@14.4.8
graphql-request@7.2.0
json2csv@6.0.0-alpha.2
npm@11.6.0

*Installation guidelines:
--> install node:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
node -e "console.log('Running Node.js ' + process.version)"

--> install a package:
npm install PACKAGE_NAME
**or simply run this command from the projet directory: bash install_node_packages.sh

--> list all the node packages:
npm list -g --depth=0

After downloading all the *.js and *.csv files to your local directory and installing all the npm packages above:

1. Use these commands to encrypt the 'accounts_keys.csv' (don't forget to populate this file with all the Account numbers and API Keys you want to query) and generate the new 'accounts_keys.enc' file:
1.1. How to generate an RSA Key Pair Run these commands from your project directory:
$ openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
$ openssl rsa -in private_key.pem -pubout -out public_key.pem

1.2. Run the encrypt_accounts.mjs script from the project directory to convert 'accounts_keys.csv' into 'accounts_keys.enc' file:
$ node encrypt_accounts.mjs

3. Now run the 'xxxx' script to generate your Dashboards backup into the folder 'dashboards_output'
$ node xxxx
5. Where do I find my data? Go to your project folder/dashboards_output to see a .json file for each backed up Dashboard. The file name will be: DASHBOARD_NAME.json
