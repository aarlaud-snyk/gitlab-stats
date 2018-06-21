# Gitlab list and stats extractor
## Simple CLI node app to extract details about Gitlab organization and repositories

[![Known Vulnerabilities](https://snyk.io/test/github/aarlaud-snyk/gitlab-stats/badge.svg)](https://snyk.io/test/github/aarlaud-snyk/gitlab-stats)


##### Packages: Node JS CLI app using axios, commander, chalk

### Installation (globally to use as CLI)
npm install -g

### Usage
- gitlab-stats repoList \<Org name\> -t \<GitlabPrivateToken\>
- gitlab-stats repoContributorCount \<Org name\> \<Repo Name\> -t \<GitlabPrivateToken\>
- gitlab-stats orgContributorCount \<Org name\>  -t \<GitlabPrivateToken\>
- Use -p or --private to restrict to private repos only (repoList and orgContributorCount only)
- use --apiurl to set the url of your Github Enterprise instance (i.e --apiurl=https://api.my-ghe-instance.com)
- if using proxy, exporting the http_proxy settings should do the trick. Google search the details of how to set that up, pretty straightforward.

#### Commands
- repoList: List all repositories under an organization. Can filter on private repos only (--private).
- repoContributorCount: List the number of active contributors for a specific repositories
- orgContributorCount: List the number of active contributors for an entire organization.. Can filter on private repos only (--private).

##### An active contributor to a repo is someone who has committed code at least once in the last 90 days.

#### Prerequisites
- Node 8 (ES6 support for Promises)
- Be member of the organization for private repositories
- **full repo scope granted** to personal access token
- Gitlab credentials
