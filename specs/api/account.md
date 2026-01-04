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
