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

## Top Up

### Input

- amount * (number, must be positive)
- referenceId (optional, will be auto-generated if not provided)

### Prerequisite

- already logged in
- valid amount (positive number)

### Action

- find the account based on the login
- create a transaction record with:
  - id: unique transaction id
  - referenceId: unique reference id (format: GC{timestamp}{random})
  - type: "topup"
  - amount: the input amount
  - status: "success"
  - createdAt: current timestamp
- add the transaction to the user's transactions array (prepend)
- add the amount to the user's balance
- **persist the updated balance and transactions to the database**

### Output

return the updated user (includes balance and transactions)

### Note

The balance and transaction history must be persisted to the database so that they are retained after page refresh. The frontend should update its state from the server response to ensure consistency.

## Withdraw

### Input

- amount * (number, must be positive)
- referenceId (optional, will be auto-generated if not provided)

### Prerequisite

- already logged in
- valid amount (positive number)
- user has sufficient balance (amount <= current balance)

### Action

- find the account based on the login
- check if user has sufficient balance
- if insufficient, return error
- create a transaction record with:
  - id: unique transaction id
  - referenceId: unique reference id (format: GC{timestamp}{random})
  - type: "withdraw"
  - amount: the input amount
  - status: "success"
  - createdAt: current timestamp
- add the transaction to the user's transactions array (prepend)
- subtract the amount from the user's balance
- **persist the updated balance and transactions to the database**

### Output

return the updated user (includes balance and transactions) or error if insufficient balance

### Note

The balance and transaction history must be persisted to the database so that they are retained after page refresh. The frontend should update its state from the server response to ensure consistency.

## Get My Purchases

### Prerequisite

- already logged in

### Action

- find the account based on the login
- return the user's purchases array

### Output

return the purchases array (each item contains: _id, seriesId, seriesName, seriesCover, episodeId, episodeNumber, episodeTitle, episodeThumbnail, price, purchasedAt)

## Add Purchase

### Input

- seriesId * (string)
- episodeId (string, optional)
- episodeNumber * (number)
- price * (number)

### Prerequisite

- already logged in
- user has sufficient balance (price <= current balance)
- episode not already purchased

### Action

- find the account based on the login
- check if user has sufficient balance
- if insufficient, return error
- check if episode is already purchased
- if already purchased, return error
- get series info (name, cover)
- get episode info (title, thumbnail) if available
- create a purchase record with:
  - _id: unique purchase id
  - seriesId: the input series id
  - seriesName: from series data
  - seriesCover: from series data
  - episodeId: from episode data or input
  - episodeNumber: the input episode number
  - episodeTitle: from episode data or "Episode {number}"
  - episodeThumbnail: from episode data or series cover
  - price: the input price
  - purchasedAt: current timestamp
- add the purchase to the user's purchases array
- subtract the price from the user's balance

### Output

return the updated user (includes balance and purchases) or error if insufficient balance or already purchased
