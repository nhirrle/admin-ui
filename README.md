https://nhirrle.github.io/admin-ui/

## Run Locally

### `npm start`

## How to use
- For the API calls that don't require a AEM Admin API token you 
can use the app directly
- If you need to set send an AEM Admin API Token:
  - click on `Settings`
  - click on 'Login Options' next to the `AEM Admin API Token` input field
  - select a provider
  - login
  - open developer console for login window
  - extract token from cookie
  - paste it in the input field
  - Save

  After that you can use the API calls that require the token.
- For UpdatePreview call with AEM as a content source you also require an AEM Token:
  - click on `Settings`
  - in a seperate window open your AEMaaCS instance
  - open dev console
  - on network tab, filter for 'token'
  - extract the token from payload
  - paste it in the input field
  - Save

  When set it will be sent with the requests that require it.


