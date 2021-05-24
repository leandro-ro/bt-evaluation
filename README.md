# BT-evaluation
Evaluation of our Fair Exchange Protocol over Bitcoin (Cash)

![Scenarios visualized](./graphics/transaction_flow.pdf)

Run the code yourself? 
The following instructions work on macOS with the WebStrom IDE. It should be similar on Linux distributions and/or other IDEs.

1. Open WebStorm and clone the repository via "Get from Version Control" 
2. Right-click on the package.json and select "Run 'npm install'" in order to install all dependencies. (Other IDEs might require you to cd to the repository and run the npm install command yourself)
3. Right-click on evaluation.js and click on "run". This should run the optimistic case. (If this doesn't work, the IDE did not set the configuration environment automatically, and you will need to specify a new one that uses the node.js interpreter)

Once this works, you can select the different cases by commenting and uncommenting lines 54 - 58 in evaluation.js and run again. Note that you can also change the protocol parameters (lines 15-19) in the given frame. Please only execute one case at a time. Otherwise, you might run into problems. After some time, adding new testnet Bitcoin Cash to Alice's and Bob's wallets might be necessary. At the beginning of each execution, their wallet balance is printed.

If you run into any problems, feel free to contact me via leandro@rometsch.org
