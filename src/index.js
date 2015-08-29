var _ = require( "lodash" );

function applyPatch( hook, ops ) {
	_.each( ops, function( op ) {
		var field = op.field || op.property;
		switch ( op.op || op.operation ) {
			case "add":
				if ( field === "events" ) {
					hook.events = hook.events || [];
					hook.events.push( op.value );
				} else {
					hook[ field ] = op.value;
				}
				break;
			case "change":
				if ( field === "events" ) {
					hook.events = hook.events || [];
					hook.events.push( op.value );
				} else {
					hook[ field ] = op.value;
				}
				break;
			case "remove":
				if ( field === "events" ) {
					hook.events = hook.events || [];
					hook.events = _.reject( hook.events, [ op.value ] );
				} else {
					delete hook[ field ];
				}
				break;
		}
	} );
	return hook;
}

function getUserIdentifier( user ) {
	return user ? ( user.orgId || user.organizationId || user.accountId || user.Id || "anonymous" ) : "anonymous";
}

function getId( envelope ) {
	var id = [ getUserIdentifier( envelope.user ), envelope.data.id ].join( "::" );
	envelope.data.id = id;
	return id;
}

function createResource( hooks ) {
	return {
		name: "hook",
		actions: {
			self: {
				method: "get",
				url: "/:id",
				handle: function( envelope ) {
					var originalId = envelope.data.id;
					var id = getId( envelope );
					return hooks.getById( id )
						.then(
							function( result ) {
								if ( result ) {
									return {
										data: result
									};
								} else {
									return {
										status: 404,
										data: { message: "Webhook not found" }
									};
								}
							},
							function( err ) {
								console.log( "Error trying to get webhook: " + originalId, err.stack );
								return {
									status: 500,
									data: { message: "Server error occurred" }
								};
							}
						);
				}
			},
			add: {
				method: "post",
				url: "/:id",
				handle: function( envelope ) {
					var originalId = envelope.data.id;
					var id = getId( envelope );
					function add() {
						return hooks.add( id, envelope.data )
							.then(
								function() {
									return {
										data: {
											id: originalId,
											message: "Webhook " + originalId + " added successfully"
										}
									};
								},
								onError
							);
					}
					function onError( err ) {
						console.log( "Error adding web hook: " + originalId, err.stack );
						return {
							status: 500,
							data: { message: "Failed to add webhook" }
						};
					}
					return hooks.checkId( id )
						.then( function( exists ) {
							return !exists ? add() :
								{
									status: 400,
									data: { message: "Webhook " + originalId + " already exists" }
								};
						},
						onError );
				},
				exclude: [ "_id" ]
			},
			list: {
				method: "get",
				url: "/",
				handle: function() {
					return hooks.getList()
						.then(
							function( list ) {
								return list;
							},
							function( err ) {
								console.log( "Error fetching webhook list:", err.stack );
								return {
									status: 500,
									data: { message: "Failed to get webhook list" }
								};
							}
						);
				},
				exclude: [ "_id" ]
			},
			remove: {
				method: "delete",
				url: "/:id",
				handle: function( envelope ) {
					var originalId = envelope.data.id;
					var id = getId( envelope );
					function onError( err ) {
						console.log( "Error removing webhook: " + originalId, err.stack );
						return {
							status: 500,
							data: { message: "Failed to remove webhook" }
						};
					}

					function remove() {
						return hooks.remove( id )
							.then(
								function() {
									return {
										data: {
											message: "Webhook " + originalId + " removed successfully"
										}
									};
								},
								onError
							);
					}
					return hooks.checkId( id )
						.then( function( exists ) {
							return exists ? remove() :
								{
									status: 404,
									data: { message: "Webhook " + originalId + " not found" }
								};
						},
						onError );
				}
			},
			replace: {
				method: "put",
				url: "/:id",
				handle: function( envelope ) {
					var originalId = envelope.data.id;
					var id = getId( envelope );
					function onError( err ) {
						console.log( "Error updating webhook: " + originalId, err.stack );
						return {
							status: 500,
							data: { message: "Failed to update webhook" }
						};
					}
					function replace() {
						return hooks.update( id, envelope.data )
							.then(
								function() {
									return {
										data: {
											id: originalId,
											message: "Webhook " + originalId + " replaced successfully"
										}
									};
								},
								onError
							);
					}
					return hooks.checkId( id )
						.then( function( exists ) {
							return exists ? replace() :
								{
									status: 404,
									data: { message: "Webhook " + originalId + " not found" }
								};
						},
						onError );
				}
			},
			update: {
				method: "patch",
				url: "/:id",
				handle: function( envelope ) {
					var originalId = envelope.data.id;
					var id = getId( envelope );
					function onError( err ) {
						console.log( "Error updating webhook: " + originalId, err.stack );
						return {
							status: 500,
							data: { message: "Failed to update webhook" }
						};
					}
					function update( hook ) {
						return hooks.update( id, hook )
							.then(
								function() {
									return {
										data: {
											id: originalId,
											message: "Webhook " + originalId + " updated successfully"
										}
									};
								},
								onError
							);
					}
					return hooks.getById( id )
						.then( function( hook ) {
							if ( hook ) {
								hook = applyPatch( hook, envelope.data );
								hook.id = id;
							}
							return hook ? update( hook ) :
								{
									status: 404,
									data: { message: "Webhook " + originalId + " not found" }
								};
						},
						onError );
				}
			}
		}
	};
}

function setup( host ) {
	var fount = host.fount;
	if ( !fount.canResolve( "hooks" ) ) {
		fount.register( "hooks", require( "./hooks" ) );
	}
	return fount.inject( [ "hooks", "webHookEvents" ], function( hooks, events ) {
		require( "./publisher" )( hooks, events );
		return createResource( hooks );
	} );
}

module.exports = setup;
