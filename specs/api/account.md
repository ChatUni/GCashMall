# Account APIs

## Check Email

### Input

- email *

### Action

- check if the email exists in db

### Output

return true/false

## Email Register

### Input

- email *
- password
- nickname = "Guest"
- photo url
- OAuth id
- OAuth type

### Prerequisite

- valid email address
- email doesn't exist in db
- if no OAuth type/id, password is required

### Action

- create an account (if has OAuth type/id, password is empty)

### Output

return the new account

## Login

### Input

- email *
- password *
- OAuth id
- OAuth type

### Prerequisite

- valid email address
- email exist in db

### Action

- find the account with that email
- if password matchs
  - generate token
  - add OAuth type/id to the account if not exist, save to db
- otherwise, error

### Output

return the token or error message

## Update Profile

### Input

- email
- nickname
- phone
- sex
- dob

### Prerequisite

- already logged in
- valid email address
- email doesn't exist in db except current account
- valid phone
- valid sex
- valid dob

### Action

- find the account based on the login
- update all fields

### Output

return the updated user

## Update Profile Picture

### Input

- photo url *

### Prerequisite

- already logged in

### Action

- find the account based on the login
- update the photo url

### Output

return the updated user

## Update Password

### Input

- old password *
- new password *

### Prerequisite

- already logged in
- old password matches the one in db
- valid new password

### Action

- find the account based on the login
- update the password

### Output

return the updated user

## Set Password

### Input

- new password *

### Prerequisite

- already logged in through OAuth
- there is no password on the account
- valid new password

### Action

- find the account based on the login
- set the password

### Output

return the updated user

## Reset Password

### Input

- email *

### Action

- if account with email exists, send a standard password reset email 

### Output

return empty

## Add to Watch List

### Input

- series id *
- episode number *

### Prerequisite

- already logged in

### Action

- find the account based on the login
- if the user's current watch list contains the series, update the episode number and current time
- otherwise, add the series and episode number to the user's watch list

### Output

return the updated user

## Get My Series List

### Prerequisite

- already logged in

### Action

- find the user id based on the login
- find all series uploaded by the user

### Output

return the series list

## Shelve/unshelve Series

### Input

- series id *

### Prerequisite

- already logged in
- the logged in user is the uploader of the series 

### Action

- mark the series as shelved/unshelved

### Output

return the updated series

## Save Series

### Input

- series body *

### Prerequisite

- already logged in
- if edit (series body contains _id), the logged in user is the uploader of the series 

### Action

- if new (series body doesn't contain _id), create the series
- otherwise, update the series

### Output

return the created/updated series

## Purchase Episode

Episode Cost = 1 GCash

### Input

- series id *
- episode number *

### Prerequisite

- already logged in
- the balance of the user's wallet is no less than the episode's cost
- series exist
- episode exist
- the series is not uploaded by the user

### Action

- deduct EC from user's wallet
- add it to the user's purchase history
- save user to db

### Output

return updated user
