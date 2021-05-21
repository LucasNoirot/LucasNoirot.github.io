var dashboard, dataSheet, datasource, stateParamName,  stateParam, fetchData;
const inputParams = []
const queryParams = []

//Initialise l'extension dés que le DOM est chargé
$(document).ready(function(){  
    tableau.extensions.initializeAsync().then(function () {      
        dashboard = tableau.extensions.dashboardContent.dashboard;
        
        //Assigne la vue contenant les données à une variable 
        dashboard.worksheets.forEach(function(worksheet){
            console.log(worksheet.name)
            if(worksheet.name.includes('Data') || worksheet.name.includes('data')){
                dataSheet = worksheet;
                stateParamName = dataSheet.name.replace("Data", "Etat")
            }
        });
        
        //Assigne la source de données à une variable
        dataSheet.getDataSourcesAsync().then(function (sources){
            datasource = sources[0];

            //Trouve le paramètre autorisant le chargement de la requête SQL 
            return dashboard.findParameterAsync(stateParamName)
        }).then(function (param){
            stateParam = param
            console.log('state param found with name' + stateParam.name)

            //Lui assigne la valeur false afin d'empecher qu'une requête se lance à l'ouverture de la page
            return stateParam.changeValueAsync('false')
        }).then(function (){
            console.log('initial value set to false')
        }).catch(function(err){
            console.log('Error while initializing extension => '+err)
        })
    });

});

//Fonction déclenchée quand le bouton est cliqué
function clickQueryButton(){   
    console.log('Query button clicked')
    
    //Pause l'éxecution une demi seconde pour laisser le temps aux paramètres de l'utiliateur de s'enregistrer
    sleep(1500)


    getParams().then(function(){
        console.log('Parameters updated');

        //Passe les paramètres rentrés par l'utilisateur à la requête
        return passParamsToQuery(inputParams)
    }).then(function(){
        return stateParam.changeValueAsync('true')
     }).then(function(){
         //Rafraichis la source de données ce qui lance la requête mnt que le paramètre est sur true
         console.log(datasource.name + ' queried sucessfully') 
        return dataSheet.getSummaryDataAsync()
     }).then(function(sumdata){
         //Log et assigne le resultat de la requête dans une table de données
         console.log(sumdata)
         loadResult(sumdata)
     }).catch(function(err){
         console.log('An error occured : '+err)
     })
}


//Stockes les paramètres allant uniquement servir à recevoir les informations de l'utilisateur dans une list
//Les autres paramètres (contenant '_') vont uniquement servir à lancer la requête quand le bouton est cliqué
async function getParams(){
    let params = await dashboard.getParametersAsync()
    console.log('FETCHING PARAMS done, starting assigning')

    params.forEach(function(param){
        console.log(param.name)
        if(! (param.name.includes('Etat') || param.name.startsWith('_')) ){
            inputParams.push(param)
        }else if (param.name.startsWith('_')){
            queryParams.push(param)
        }
    })

    console.log('get parameters done')
}

//Transfere la valeur des paramètres entrés par l'utilisateur à ceux utilisés dans la requête
async function passParamsToQuery(params){
    for(const p of params){
        queryParamName = '_' + p.name.trim()
        try{
            const queryParam = await dashboard.findParameterAsync(queryParamName)
            const newValueParam = await queryParam.changeValueAsync(p.currentValue.value)
            console.log(queryParam.name + ' has a new value : '+newValueParam.value)
        }catch(e){
            console.log('Error while setting a parameter => '+e)
        }
    }
}


//Fonction permettant d'arreter l'éxecution (nécessaire pour attendre que les paramètres s'enregistrent)
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }



function loadResult(result){
    console.log('Loading result')
    $('#result').DataTable({
        columns: result._columns,
        data : result._data,
        buttons : [
            {
                extends : 'csv'
            }
        ]
    });
    $('#downloadButton').click( ()=> {
        $('#result').DataTable().buttons(0,0).trigger()
    })
    unlockDownloadButton()
  }

  function unlockDownloadButton(){
      $('#downloadButton').removeClass('nonAvailable').addClass('available')
  }

  function lockDownloadButton(){
    $('#downloadButton').removeClass('available').addClass('nonAvailable')
}


      
    



