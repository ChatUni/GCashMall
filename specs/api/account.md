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
- password *
- nickname = "Guest"
- photo url

### Prerequisite

- valid email address
- email doesn't exist in db

### Action

- create an account

### Output

return the new account

## Login

### Input

- email *
- password *

### Prerequisite

- valid email address
- email exist in db

### Action

- find the account with that email
- if password matchs, generate token
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
