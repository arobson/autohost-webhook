## Autohost Webhook
Webhooks for all.

### Installation & Initialization
Installation and setup are straight-forward.

#### Example - includes installation of prerequisites
```bash
npm install autohost hyped fount postal -S
```

#### Using default NeDB storage for hook information
```javascript
var autohost = require( "autohost" );
var host;
var hyped = require( "hyped" )();
var fount = require( "fount" );
var postal = require( "postal" );
var channel = postal.channel( "eventChannel" );

fount.register( "webHookEvents", channel );

host = hyped.createHost( autohost, {
	port: config.nonstop.host.port,
	modules: [
		"autohost-webhook"
	],
	fount: fount
}, function() {
	host.start();
} );
```

#### Using a custom storage provider for hook information

> See Storage API to understand how to create your own compatible storage layer.

```javascript
var autohost = require( "autohost" );
var host;
var hyped = require( "hyped" )();
var fount = require( "fount" );
var postal = require( "postal" );
var channel = postal.channel( "eventChannel" );
var hooks = require( "./myHookStorage" );

fount.register( "hooks", hooks );
fount.register( "webHookEvents", channel );

host = hyped.createHost( autohost, {
	port: config.nonstop.host.port,
	modules: [
		"autohost-webhook"
	],
	fount: fount
}, function() {
	host.start();
} );
```

## Use

### Sending Messages
To call webhooks, simply send a message to the channel registered as `"webHookEvents"` earlier.

```javascript
// this will send the message to all registered webhooks with a subscription matching "some.event" or that have not provided an `events` filter
channel.publish( "some.event", { ... } );
```

## HTTP API

### About Headers
When creating a web hook, please note that the headers section is the only way to support/provide authentication when calling an endpoint. It is recommended that even with HTTPS in place, your users don't provide anything other than tokens with least privilege.

### About Events
Without providing a list of events that your webhook is interested in, this module will call your webhook for _every_ event. Events support AMQP style pattern matching so if you wanted to know about every event related to a user, you could provide "user.#" to see all events under that namespace.

### PUT vs. PATCH
Both are supported. PUT requires you to provide _all_ the hook data while PATCH supports only changing the property you need to change.

### Self
_Request_
`GET /api/hook/:id`

_Response_
```json
{
	"id": "",
	"url": "http://the.full.url/to/call",
	"method": "POST",
	"headers": {
	},
	"events": []
}
```

### List
_Request_
`GET /api/hook/`

_Response_
```json
{
	"hooks": [
		{
			"id": "",
			"url": "http://the.full.url/to/call",
			"method": "POST",
			"headers": {
				"Authorization": "Bearer a.token"
			},
			"events": []
		},
		{
			"id": "",
			"url": "http://the.full.url/to/call",
			"method": "POST",
			"headers": {
				"Authorization": "Bearer a.token"
			},
			"events": []
		}
	]
}
```

### Add
_Request_
`POST /api/hook/:id`
```json
{
	"url": "http://the.full.url/to/call",
	"method": "POST",
	"headers": {
		"Authorization": "Bearer a.token"
	},
	"events": []
}
```

_Response_
```json
{
	"id": "webhook.identifier",
	"message": "Webhook webhook.identifier added successfully"
}

### Update
_Request_
`PATCH /api/hook/:id`
```json
[
	{ "op": "add", "field": "events", "value": "user.#" },
	{ "op": "remove", "field": "headers" },
	{ "op": "change", "field": "method", "value": "PUT" },
]
```

_Response_
```json
{
	"id": "webhook.identifier",
	"message": "Webhook webhook.identifier updated successfully"
}

### Replace
_Request_
`PUT /api/hook/:id`
```json
{
	"url": "http://the.full.url/to/call",
	"method": "POST",
	"headers": {
		"Authorization": "Bearer new.token"
	},
	"events": [ "stuff" ]
}
```

_Response_
```json
{
	"id": "webhook.identifier",
	"message": "Webhook webhook.identifier replaced successfully"
}


### Remove
_Request_
`DELETE /api/hook/:id`

_Response_
```json
{
	"id": "webhook.identifier",
	"message": "Webhook webhook.identifier removed successfully"
}

## Hook Storage API
Each call should return a promise. The following calls must be supplied:

 * add( id, hook )
 * checkId( id )
 * getById( id )
 * getList()
 * remove( id )
 * update( id, hook )

The structure of the hook object follows this format:

```javascript
{
	id: '', 		// required
	url: '',		// required
	method: '',		// required
	headers: {},	// optional, content-type will always be "application/json"
	events: [],		// optional, list of events to subscribe to
}
```

> Note: the id is auto-prefixed based on the authenticated user. The delimiter used to separate the user identifier from the hook id is `"::"`.
