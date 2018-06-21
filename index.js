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

const filterActiveMembers = (token, apiurl, filterActiveMembers) => {
  return new Promise((resolve,reject) => {
    var config = {
      headers: {'Private-Token': token}
    };
    filteredMembersList = [];
    var counter = 0;

    Object.entries(filterActiveMembers).forEach(
        async ([key, value]) => {
          // console.log(value.id);
          // filteredMembersList.push(value.id)
          let userData = await getDataFromGitlabAPI(apiurl+'/users/'+value.id+'/events?action=pushed&after='+cutOffDate, config);
          let commit_count = 0;
          for(var i=0; i<userData.data.length; i++){
            if(userData.data[i].push_data.commit_count > 0){
              commit_count++;
            }
          }
          if(commit_count > 0){
              filteredMembersList.push({"name": key, "id": value.id, "username": value.username, "number of commits": commit_count, "groups": value.groups });
          }

          //checking if all users have been reviewed and resolving promise if so
          counter++;
          if(counter == Object.keys(filterActiveMembers).length){
            resolve(filteredMembersList);
          }

        }
    );

  });

}

const getGitlabGroupList = (token, apiurl) => {
  return new Promise((resolve, reject) => {
    var config = {
      headers: {'Private-Token': token}
    };

    getDataFromGitlabAPI(apiurl+'/groups?all_available=true', config)
    .then((data) => {
      resolve(data);
    })
    .catch((error) => {
      reject(error);
    });
  });
}

async function getGitlabGroupsMembers(token, apiurl, groups) {

    var config = {
      headers: {'Private-Token': token}
    };

    var users = [];

    for(var i=0; i<groups.length;i++){

      var data = await getDataFromGitlabAPI(apiurl+'/groups/'+groups[i].id+'/members', config);
      // .then((data) => {
        for(var j=0; j<data.data.length; j++){
          users.push({"id":data.data[j].id, "name": data.data[j].name, "username":data.data[j].username, "group":groups[i].name});
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

        console.log(chalk.blue("\nListing groups the account"));
        getGitlabGroupList(options.token, options.apiurl)
        .then((data) => {
          var groups = [];
          data.data.forEach((item) => {
              //console.log(item.full_path);
              groups.push({"name":item.full_path, "id":item.id});
          });
          console.log(chalk.red('==> '+data.data.length + ' groups'));
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
          console.log(finalList);
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
