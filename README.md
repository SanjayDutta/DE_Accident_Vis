# Weather Data VIS


## About the Project

Using D3.js we visualize various aspects of the attached dataset, to answer our research question <i>"In Germany, are you more likely to be in an accident on a Damp/Wet Road or an Slippery/Snow Road?"</i>


## Information About Dataset
Since the dataset is too large, for visualization purposes, we modify the dataset into multiple parts, in order to reduce processing time. 

The dataset was subjected to various queries, to generate results that best fits our purpose. 

The datasets are already available in the <code>./public</code> directory.

These queries are noted down in the jupyter notebook <code>research.ipynb</code>. Additional information in the form of markdown are added in the notebook to better understand the queries which were used. You do not need to run these Python code again, as the modified datasets are already available.

<b>Please Note:</b> If you want to run the notebook, you require <code>pyspark</code> installed in your machine.

## Setup
- Install the Live Server extension to Visual Studio Code: [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- Please add the original datasets (XLSX/JSON) in the <code>./public</code> directory, else visualizations won't load.

## Start
- Open the `template` project in Visual Studio Code
- Press the `Go Live` button (at the bottom right side of the status bar)
- The webpage will be opened automatically in the browser
- Please wait 40seconds - 1minute for the data to get loaded into the browser.

