var dashboard, dataSheet, datasource, stateParamName, stateParam, query_result, resultTable;
const inputParams = []
const queryParams = []

//Initialise l'extension dés que le DOM est chargé
$(document).ready(function(){  
    tableau.extensions.initializeAsync().then(function () {      
        dashboard = tableau.extensions.dashboardContent.dashboard;

        console.log('test 46')

        
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
    
    //Réinitialise les variables contenant le résultat 
    if($('#downloadButton').hasClass('available')){
        lockDownloadButton()
    }
    if(query_result != null){
        console.log('removing previous data')
        query_result = null
        resultTable.clear()
        resultTable.destroy()
    }

    
     
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
         loadResult(sumdata)
     }).catch(function(err){
         console.log('An error occured : '+err)
     })
}


//Stockes les paramètres allant uniquement servir à recevoir les informations de l'utilisateur dans une list
//Les autres paramètres (contenant '_') vont uniquement servir à lancer la requête quand le bouton est cliqué
async function getParams(){
    let params = await dashboard.getParametersAsync()

    params.forEach(function(param){
        if(! (param.name.includes('Etat') || param.name.startsWith('_')) ){
            inputParams.push(param)
        }else if (param.name.startsWith('_')){
            queryParams.push(param)
        }
    })
}

//Transfere la valeur des paramètres entrés par l'utilisateur à ceux utilisés dans la requête
async function passParamsToQuery(params){
    for(const p of params){
        queryParamName = '_' + p.name.trim()
        try{
            const queryParam = await dashboard.findParameterAsync(queryParamName)
            const newValueParam = await queryParam.changeValueAsync(p.currentValue.value)
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


//Fonction chargeant les données renvoyées par le serveur sur la page
function loadResult(result){
    query_result = extractData(result)

    console.log('Loading result')
    resultTable = $('#result').DataTable({
        "scrollX" : true,
        "scrollY" : true,
        "deferRender": true,
        "columns" : query_result['columns'],
        "data" : query_result['data'],
        "language": {
            "lengthMenu": "Afficher _MENU_ entrées par page",
            "zeroRecords": "Aucun résultat...",
            "info": "Afficher page _PAGE_ de _PAGES_",
            "infoEmpty": "Pas de données disponibles",
            "infoFiltered": "(filtré de _MAX_ entrées totales)",
            "search":         "Recherche :",
            "paginate": {
                "first":      "Première page",
                "last":       "Dernière page",
                "next":       "Suivant",
                "previous":   "Précédent"
            },
        }
    });
    unlockDownloadButton()
  }

//Fonction permettant de convertir le résultat renvoyé par le serveur en arrays afin de les charger dans <table></table>
function extractData(rawData){
    cols = []
    body = []
    result = {}

    for(var i = 0; i < rawData.data.length; i++){
        row = []
        for(var j = 0 ; j < rawData.data[i].length; j++){
            row.push(rawData.data[i][j]._value)
        }
        body.push(row)
    }

    for(var i = 0; i < rawData.columns.length; i++){
        cols.push({'title': rawData.columns[i]._fieldName,
                   'data': i})
    }

    return  {
        'columns' : cols,
        'data' : body   
        }
}

//Fonction convertissant le résultat en format CSv et lançant le téléchargement
function downloadCSV(){
    console.log('clicked')
    let content = "data:text/csv;charset=utf-8,"

    if(query_result == null){
        console.log('Trying to create CSV from empty result')
        return
    }

    let headers = ''
    query_result['columns'].forEach(function(col){
        headers += col['title'] + ';'
    })

    content += (headers + "\r\n")
    
    query_result['data'].forEach(function(row){
        let newLine = row.join(';')
        content += (newLine + "\r\n")
    })

    var encodedUri = encodeURI(content)
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "requete.csv");
    document.body.appendChild(link);
    link.click()


}

//Autorise le click sur la bouton de téléchargement
function unlockDownloadButton(){
    $('#downloadButton').removeClass('nonAvailable').addClass('available')
}

//Interdit le click sur le bouton de téléchargement
function lockDownloadButton(){
    $('#downloadButton').removeClass('available').addClass('nonAvailable')
}


      
    



