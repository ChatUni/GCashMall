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

### Prerequisite

- valid email address
- email doesn't exist in db

### Action

- create an account with default Nickname - "Guest"

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
