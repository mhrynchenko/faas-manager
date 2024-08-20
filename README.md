# FAAS Manager

## How to run the project

1. Install dependancies
```
yarn
```
2. Run dev
```
npm run dev
```

## Format of the request

POST http://localhost:8005/messages
```
{  
    "name": "dummy",
    "message": "Message to send"
}
```

GET http://localhost:8005/statistics
