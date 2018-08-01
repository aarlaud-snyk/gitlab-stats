#!/usr/bin/env node
const INTER_CALLS_DELAY = 1000;
const NB_RECORDS_PER_PAGE = 100; //max GL API
const DEFAULT_GITLAB_COM_API = 'https://gitlab.com/api/v4';
const NBOFDAYS = 90;
//2016-08-01T00:00:00.000+00:00

var program = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const axios = require('axios');
const moment = require('moment');


var cutOffDate;

const authenticate = (options) => {
  return "";
}


const calculateCutOffDate = () => {
  cutOffDate = moment().subtract(NBOFDAYS, 'days').format('YYYY-MM-DD');
  console.log(chalk.red("Counting commits only after "+cutOffDate));

}



const getDataFromGitlabAPI = (url, config) => {
  return new Promise((resolve,reject) => {
    axios.get(url, config)
    .then((response) => {
      resolve({"data":response.data, "headers":response.headers});
    })
    .catch((error) => {
      reject(error);
    });

  });
}

const getMemberEvents = async (apiurl,config,memberKey, member, filteredMembersList) => {
  // console.log(value.id);
  // filteredMembersList.push(value.id)
  console.log('checking if '+memberKey + ' which ID='+member.id + ' has been active in last '+NBOFDAYS+' days');
  var userData;
  var commit_count = 0;
  try {

      userData = await getDataFromGitlabAPI(apiurl+'/users/'+member.id+'/events?action=pushed&after='+cutOffDate, config);

      for(var i=0; i<userData.data.length; i++){
        if(userData.data[i].push_data && userData.data[i].push_data.commit_count && userData.data[i].push_data.commit_count > 0){
          commit_count++;
        }
      }
  } catch (err) {
    console.error("Failed to get user "+member.id+ " push data. Skipping\n");
    console.error(err);
  }


  var totalPages = userData.headers['x-total-pages'];
  for(var j=2; j<=totalPages; j++){
    try {

       userData = await getDataFromGitlabAPI(apiurl+'/users/'+member.id+'/events?action=pushed&after='+cutOffDate+'&page='+j, config);

       for(var k=0; k<userData.data.length; k++){
         if(userData.data[k].push_data && userData.data[k].push_data.commit_count && userData.data[k].push_data.commit_count > 0){
           commit_count++;
         }
       }
    } catch (err) {
      console.log(err);
      console.error("Failed to get user "+member.id+ " push data at page "+j+". Skipping\n");
    }

  }

  if(commit_count > 0){
      filteredMembersList.push({"name": memberKey, "id": member.id, "username": member.username, "number of commits": commit_count, "groups": member.groups });
  }



}

const filterActiveMembers = (token, apiurl, filterActiveMembers) => {
  return new Promise((resolve,reject) => {
    var config = {
      headers: {'Private-Token': token}
    };
    filteredMembersList = [];
    var counter = 0;

    var extractionQueue = [];
    console.log(chalk.blue("Filtering out inactive members of groups"));
    for(var a=0; a<Object.keys(filterActiveMembers).length; a++){


      let memberKey = Object.keys(filterActiveMembers)[a];
//      console.log('queueing '+memberKey);
      extractionQueue.push(() => getMemberEvents(apiurl,config,memberKey,filterActiveMembers[memberKey], filteredMembersList));
//      console.log('done queueing '+ memberKey);

    }

    var queueProcessing=setInterval(function(){
      if(extractionQueue.length > 0){
        extractionQueue[0]();
        extractionQueue.shift();
      }else{
          clearInterval(queueProcessing);
          resolve(filteredMembersList);

      }

    },INTER_CALLS_DELAY);

    // Object.entries(filterActiveMembers).forEach(
    //     async ([key, value]) => {
    //       // console.log(value.id);
    //       // filteredMembersList.push(value.id)
    //       var userData;
    //       var commit_count = 0;
    //       try {
    //         console.log('call '+counter);
    //           userData = await getDataFromGitlabAPI(apiurl+'/users/'+value.id+'/events?action=pushed&after='+cutOffDate, config);
    //           console.log('done call '+counter);
    //           for(var i=0; i<userData.data.length; i++){
    //             if(userData.data[i].push_data && userData.data[i].push_data.commit_count && userData.data[i].push_data.commit_count > 0){
    //               commit_count++;
    //             }
    //           }
    //       } catch (err) {
    //         console.error("Failed to get user "+value.id+ " push data. Skipping\n");
    //         console.error(err);
    //       }
    //
    //
    //       var totalPages = userData.headers['x-total-pages'];
    //       for(var j=2; j<=totalPages; j++){
    //         try {
    //           console.log('call extra pages'+counter);
    //            userData = await getDataFromGitlabAPI(apiurl+'/users/'+value.id+'/events?action=pushed&after='+cutOffDate+'&page='+j, config);
    //            console.log('done call extra pages'+counter);
    //            for(var k=0; k<userData.data.length; k++){
    //              if(userData.data[k].push_data && userData.data[k].push_data.commit_count && userData.data[k].push_data.commit_count > 0){
    //                commit_count++;
    //              }
    //            }
    //         } catch (err) {
    //           console.log(err);
    //           console.error("Failed to get user "+value.id+ " push data. Skipping\n");
    //         }
    //
    //       }
    //
    //       if(commit_count > 0){
    //           filteredMembersList.push({"name": key, "id": value.id, "username": value.username, "number of commits": commit_count, "groups": value.groups });
    //       }
    //
    //       //checking if all users have been reviewed and resolving promise if so
    //       counter++;
    //       if(counter == Object.keys(filterActiveMembers).length){
    //         resolve(filteredMembersList);
    //       }
    //
    //     }
    // );


  });

}

async function getGitlabGroupList (token, apiurl) {
  // return new Promise((resolve, reject) => {
    var config = {
      headers: {'Private-Token': token}
    };

    var groupData = [];

    var data = await getDataFromGitlabAPI(apiurl+'/groups?all_available=true', config);
    groupData.push(...data.data);
    var totalPages = data.headers['x-total-pages'];

    for(var i=2; i<=totalPages; i++){
      data = await getDataFromGitlabAPI(apiurl+'/groups?all_available=true&page='+i, config);
      groupData.push(...data.data);
    }

    return groupData;


    // getDataFromGitlabAPI(apiurl+'/groups?all_available=true', config)
    // .then((data) => {
    //   // console.log(data.headers['x-page']);
    //   // console.log(data.headers['x-total-pages']);
    //   resolve(data);
    // })
    // .catch((error) => {
    //   reject(error);
    // });
  //});
}

async function getGitlabGroupsMembers(token, apiurl, groups) {

    var config = {
      headers: {'Private-Token': token}
    };

    var users = [];
    console.log(chalk.blue("Extracting members of groups"));
    for(var i=0; i<groups.length;i++){
      console.log("Extracting members of "+groups[i].name);

      var data = await getDataFromGitlabAPI(apiurl+'/groups/'+groups[i].id+'/members', config);
      // .then((data) => {
        for(var j=0; j<data.data.length; j++){
          users.push({"id":data.data[j].id, "name": data.data[j].name, "username":data.data[j].username, "group":groups[i].name});
        }
        var totalPages = data.headers['x-total-pages'];

        for(var k=2; k<=totalPages; k++){
          data = await getDataFromGitlabAPI(apiurl+'/groups/'+groups[i].id+'/members?page='+k, config);
          for(var j=0; j<data.data.length; j++){
            users.push({"id":data.data[j].id, "name": data.data[j].name, "username":data.data[j].username, "group":groups[i].name});
          }
        }


    }


    return users;


}




const consolidateMembersList = (members) => {
  var membersList = []

  for(var i=0;i<members.length;i++){

      if(members[i].name in membersList){
        let existingGroups = membersList[members[i].name].groups;
        existingGroups.push(members[i].group);
        membersList[members[i].name] = {"id": members[i].id, "username": members[i].username, "groups": existingGroups}
        // let commitCount = contributorsList[data[i][j].name]['# of commits'];
        // contributorsList[data[i][j].name] = {'# of commits': commitCount + data[i][j]['# of commits']};
      } else {
        var groups = [];
        groups.push(members[i].group);
        membersList[members[i].name] = {"id": members[i].id, "username": members[i].username, "groups": groups}
      }
  }
  console.log(chalk.red("Found "+ Object.keys(membersList).length + " unique members across those groups"));

  Object.entries(membersList).forEach(
      ([key, value]) => console.log(key+ " in group(s) " + value.groups)
  );
  return membersList;
}

const introText = () => {
  return new Promise((resolve,reject) => {
    figlet.text('SNYK', {
    font: 'Star Wars',
    horizontalLayout: 'default',
    verticalLayout: 'default'
    }, function(err, data) {
      if (err) {
          console.log('Something went wrong...');
          console.dir(err);
          reject(err);
      }
      console.log(data)
      console.log("\n");
      console.log("Snyk tool for counting active contributors");
      resolve();
    });
  });


}

program
  .version('1.0.0')
  .description('Snyk\'s Gitlab contributors counter (active in the last 3 months)')
  .usage('<command> [options] \n options: -t <GLPrivateToken> --apiurl <apiUrl if not https://gitlab.com/api/v4>')


  program
    .command('listAllGroupsMembers')
    .description('List all groups for the account')
    .option('-t, --token [GLToken]', 'Running command with Personal Gitlab Private Token')
    .option('-apiurl, --apiurl [apiurl]', 'API url if not https://gitlab.com/api/v4')
    .action((options) => {
      introText()
      .then(() => {

        calculateCutOffDate();

        console.log(chalk.blue("\nListing groups that the token has access to and public groups"));
        getGitlabGroupList(options.token, options.apiurl)
        .then((data) => {

          var groups = [];
          data.forEach((item) => {
              //console.log(item.full_path);
              groups.push({"name":item.full_path, "id":item.id});
          });
          console.log(chalk.red('==> '+data.length + ' groups'));
          Object.entries(groups).forEach(
              ([key, value]) => console.log(value.name)
          );
          return groups;
        })
        .then((groups) => getGitlabGroupsMembers(options.token, options.apiurl,groups))
        .then((members) => {
          return consolidateMembersList(members);
        })
        .then((membersList) => {
          return filterActiveMembers(options.token, options.apiurl,membersList);
        })
        .then((finalList) => {
          console.log(chalk.red(finalList.length + " users with at least 1 commits in the last "+ NBOFDAYS + " days"));
          for(var b=0;b<finalList.length;b++){
            console.log(chalk.blue(finalList[b].name) + ":"+ finalList[b]['number of commits'] + ' commits in groups '+finalList[b]['groups']);
          }
          //console.log(finalList);
          console.log(chalk.red("\nThank you and Stay secure !\n"));
        })
        .catch((error) => {
          console.error(error);
        });
      });

    });

program
  .command('projectContributorCount [group] [project]')
  .description('Count number of active contributors to Gitlab project')
  .option('-t, --token [GLToken]', 'Running command with Personal Github Token (for 2FA setup)')
  // .option('-u, --username [username]', 'username (use Token if you set 2FA on Github)')
  // .option('-pwd, --password [password]', 'password')
  .option('-apiurl, --apiurl [apiurl]', 'API url if not https://gitlab.com/api/v4')
  .action((group, project, options) => {
    introText()
    .then(() => {
      getGitlabProjectContributorCount(options.token, options.apiurl, group+'%2f'+project)
      .then((data) => {
        console.log(data);
      })
    })
    .catch((error)=>{
      console.error(error);
    })

  });

  program
    .command('orgContributorCount [org]')
    .description('Count number of active contributors to Github repo across an entire organization')
    .option('-t, --token [GHToken]', 'Running command with Personal Github Token (for 2FA setup)')
    .option('-u, --username [username]', 'username (use Token if you set 2FA on Github)')
    .option('-pwd, --password [password]', 'password')
    .option('-p, --private', 'private repos only')
    .option('-apiurl, --apiurl [apiurl]', 'API url if not https://api.github.com')
    .action((org, options) => {
      introText();
    });


program.parse(process.argv);

if (program.args.length === 0) program.help();
