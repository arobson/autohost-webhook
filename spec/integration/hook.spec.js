require( "../setup" );
var hyped = require( "hyped" )();
var autohost = require( "autohost" );
var fount = require( "fount" );
var request = require( "request" );
var channel = require( "postal" ).channel( "ignore" );

describe( "Hook Resource", function() {
	var client, host, hooks;

	before( function( done ) {
		nock.cleanAll();
		nock.enableNetConnect();
		hooks = {
			add: _.noop,
			checkId: _.noop,
			getById: _.noop,
			getList: _.noop,
			remove: _.noop,
			update: _.noop
		};
		fount.register( "hooks", hooks );
		fount.register( "webHookEvents", channel );
		host = hyped.createHost( autohost, {
			port: 8118,
			fount: fount,
			modules: [ "./src/index.js" ]
		}, function() {
			client = halon( {
				root: "http://localhost:8118/api",
				adapter: halon.requestAdapter( request )
			} );
			host.start();
			setTimeout( function() {
				client.connect()
						.then( function( client ) {
							client = client;
							done();
						} );
			}, 100 );
		} );
	} );

	describe( "self", function() {
		describe( "when id is valid", function() {
			var validIdMock, response;
			before( function() {
				nock.enableNetConnect();
				validIdMock = sinon.mock( hooks );
				validIdMock.expects( "getById" )
					.withArgs( "anonymous::test-hook" )
					.resolves( {
						id: "test-hook",
						url: "stuff",
						method: "lol"
					} );
				return client.hook.self( { id: "test-hook" } )
					.then( function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getById", function() {
				validIdMock.verify();
			} );

			it( "should have returned hook definition", function() {
				return response.should.partiallyEql( {
					status: 200,
					id: "test-hook",
					url: "stuff",
					method: "lol"
				} );
			} );
		} );

		describe( "when id is invalid", function() {
			var invalidIdMock, response;
			before( function() {
				nock.enableNetConnect();
				invalidIdMock = sinon.mock( hooks );
				invalidIdMock.expects( "getById" )
					.withArgs( "anonymous::test-hook" )
					.resolves( undefined );
				return client.hook.self( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getById", function() {
				invalidIdMock.verify();
			} );

			it( "should have returned hook definition", function() {
				return response.should.partiallyEql( {
					status: 404,
					message: "Webhook not found"
				} );
			} );
		} );

		describe( "when error occurs", function() {
			var selfErrorMock, response;
			before( function() {
				nock.enableNetConnect();
				selfErrorMock = sinon.mock( hooks );
				selfErrorMock.expects( "getById" )
					.rejects( new Error( "What the name of LOL?" ) );
				return client.hook.self( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getById", function() {
				selfErrorMock.verify();
			} );

			it( "should have returned server error", function() {
				return response.should.partiallyEql( {
					status: 500,
					message: "Server error occurred"
				} );
			} );
		} );
	} );

	describe( "add", function() {
		describe( "when add is successful", function() {
			var validAddMock, response;
			before( function() {
				nock.enableNetConnect();
				validAddMock = sinon.mock( hooks );
				validAddMock.expects( "add" )
					.withArgs( "anonymous::test-hook", {
						id: "anonymous::test-hook",
						url: "stuff",
						method: "lol"
					} )
					.resolves( {
						id: "test-hook",
						url: "stuff",
						method: "lol"
					} );
				validAddMock.expects( "checkId" )
					.withArgs( "anonymous::test-hook" )
					.resolves( false );
				return client.hook.add( { id: "test-hook", body: {
					url: "stuff",
					method: "lol"
				} } )
					.then( function( result ) {
						response = result;
					}, console.log );
			} );

			it( "should have called hooks.add", function() {
				validAddMock.verify();
			} );

			it( "should have returned success", function() {
				return response.should.partiallyEql( {
					status: 200,
					id: "test-hook",
					message: "Webhook test-hook added successfully"
				} );
			} );
		} );

		describe( "when id exists", function() {
			var invalidIdMock, response;
			before( function() {
				nock.enableNetConnect();
				invalidIdMock = sinon.mock( hooks );
				invalidIdMock.expects( "checkId" )
					.resolves( true );
				return client.hook.add( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.check only", function() {
				invalidIdMock.verify();
			} );

			it( "should have returned duplicate error", function() {
				return response.should.partiallyEql( {
					status: 400,
					message: "Webhook test-hook already exists"
				} );
			} );
		} );

		describe( "when error occurs", function() {
			var invalidIdMock, response;
			before( function() {
				nock.enableNetConnect();
				invalidIdMock = sinon.mock( hooks );
				invalidIdMock.expects( "add" )
					.rejects( "Uh, how 'bout NO" );
				invalidIdMock.expects( "checkId" )
					.resolves( false );
				return client.hook.add( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.check and hooks.add", function() {
				invalidIdMock.verify();
			} );

			it( "should have returned server error", function() {
				return response.should.partiallyEql( {
					status: 500,
					message: "Failed to add webhook"
				} );
			} );
		} );
	} );

	describe( "list", function() {
		describe( "when list is returned", function() {
			var valid, response;
			before( function() {
				nock.enableNetConnect();
				valid = sinon.mock( hooks );
				valid.expects( "getList" )
					.resolves( [
						{
							id: "test-hook1",
							url: "stuff",
							method: "lol"
						},
						{
							id: "test-hook2",
							url: "stuff",
							method: "lol"
						}
					] );
				return client.hook.list()
					.then( function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getList", function() {
				valid.verify();
			} );

			it( "should have returned hook definition", function() {
				return response.should.partiallyEql( {
					hooks: [
						{
							id: "test-hook1",
							url: "stuff",
							method: "lol"
						},
						{
							id: "test-hook2",
							url: "stuff",
							method: "lol"
						}
					]
				} );
			} );
		} );

		describe( "when error occurs", function() {
			var errorMock, response;
			before( function() {
				nock.enableNetConnect();
				errorMock = sinon.mock( hooks );
				errorMock.expects( "getList" )
					.rejects( "Uh, how 'bout NO" );
				return client.hook.list()
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getList", function() {
				errorMock.verify();
			} );

			it( "should have returned server error", function() {
				return response.should.partiallyEql( {
					status: 500,
					message: "Failed to get webhook list"
				} );
			} );
		} );

		describe( "remove", function() {
			describe( "when id is valid", function() {
			var validIdMock, response;
			before( function() {
				nock.enableNetConnect();
				validIdMock = sinon.mock( hooks );
				validIdMock.expects( "remove" )
					.resolves( {} );
				validIdMock.expects( "checkId" )
					.resolves( true );
				return client.hook.remove( { id: "test-hook" } )
					.then( function( result ) {
						response = result;
					}, console.log );
			} );

			it( "should have called hooks.check and hooks.remove", function() {
				validIdMock.verify();
			} );

			it( "should have returned success", function() {
				return response.should.partiallyEql( {
					status: 200,
					message: "Webhook test-hook removed successfully"
				} );
			} );
		} );

			describe( "when id does not exist", function() {
			var invalidIdMock, response;
			before( function() {
				nock.enableNetConnect();
				invalidIdMock = sinon.mock( hooks );
				invalidIdMock.expects( "checkId" )
					.resolves( false );
				return client.hook.remove( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.check only", function() {
				invalidIdMock.verify();
			} );

			it( "should have returned error", function() {
				return response.should.partiallyEql( {
					status: 404,
					message: "Webhook test-hook not found"
				} );
			} );
		} );

			describe( "when error occurs", function() {
			var errorMock, response;
			before( function() {
				nock.enableNetConnect();
				errorMock = sinon.mock( hooks );
				errorMock.expects( "remove" )
					.rejects( "Uh, how 'bout NO" );
				errorMock.expects( "checkId" )
					.resolves( true );
				return client.hook.remove( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.check and hooks.remove", function() {
				errorMock.verify();
			} );

			it( "should have returned server error", function() {
				return response.should.partiallyEql( {
					status: 500,
					message: "Failed to remove webhook"
				} );
			} );
		} );
		} );
	} );

	describe( "replace", function() {
		describe( "when update is successful", function() {
			var validMock, response;
			before( function() {
				nock.enableNetConnect();
				validMock = sinon.mock( hooks );

				validMock.expects( "update" )
					.withArgs(
						"anonymous::test-hook",
						{
							id: "anonymous::test-hook",
							url: "http://test",
							method: "POST"
						}
					)
					.resolves( {
						id: "test-hook"
					} );

				validMock.expects( "checkId" )
					.resolves( true );

				return client.hook.replace( { id: "test-hook", body: {
					url: "http://test",
					method: "POST"
				} } )
					.then( function( result ) {
						response = result;
					}, console.log );
			} );

			it( "should have called hooks.checkId and hooks.update", function() {
				validMock.verify();
			} );

			it( "should have returned success", function() {
				return response.should.partiallyEql( {
					status: 200,
					id: "test-hook",
					message: "Webhook test-hook replaced successfully"
				} );
			} );
		} );

		describe( "when id does not exist", function() {
			var invalidIdMock, response;
			before( function() {
				nock.enableNetConnect();
				invalidIdMock = sinon.mock( hooks );
				invalidIdMock.expects( "checkId" )
					.resolves( false );
				return client.hook.replace( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.checkId only", function() {
				invalidIdMock.verify();
			} );

			it( "should have returned duplicate error", function() {
				return response.should.partiallyEql( {
					status: 404,
					message: "Webhook test-hook not found"
				} );
			} );
		} );

		describe( "when error occurs", function() {
			var errorMock, response;
			before( function() {
				nock.enableNetConnect();
				errorMock = sinon.mock( hooks );
				errorMock.expects( "update" )
					.rejects( new Error( "Uh, how 'bout NO" ) );
				errorMock.expects( "checkId" )
					.resolves( true );
				return client.hook.replace( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.checkId and hooks.update", function() {
				errorMock.verify();
			} );

			it( "should have returned server error", function() {
				return response.should.partiallyEql( {
					status: 500,
					message: "Failed to update webhook"
				} );
			} );
		} );
	} );

	describe( "update", function() {
		describe( "when update is successful", function() {
			var validMock, response;
			before( function() {
				nock.enableNetConnect();
				validMock = sinon.mock( hooks );
				validMock.expects( "update" )
					.withArgs(
						"anonymous::test-hook",
						{
							id: "anonymous::test-hook",
							url: "http://test.io",
							method: "POST",
							events: [ "test.#" ]
						}
					)
					.resolves( {
						id: "test-hook"
					} );

				validMock.expects( "getById" )
					.withArgs( "anonymous::test-hook" )
					.resolves( {
						id: "test-hook",
						url: "http://test",
						method: "PUT",
						headers: {
							stuff: "lolwhat"
						}
					} );

				return client.hook.update( { id: "test-hook", body: [
						{ op: "change", field: "url", value: "http://test.io" },
						{ op: "change", field: "method", value: "POST" },
						{ op: "remove", field: "headers" },
						{ op: "add", field: "events", value: "test.#" }
					] } )
					.then( function( result ) {
						response = result;
					}, console.log );
			} );

			it( "should have called hooks.getById and hooks.update", function() {
				validMock.verify();
			} );

			it( "should have returned success", function() {
				return response.should.partiallyEql( {
					status: 200,
					id: "test-hook",
					message: "Webhook test-hook updated successfully"
				} );
			} );
		} );

		describe( "when id does not exists", function() {
			var invalidIdMock, response;
			before( function() {
				nock.enableNetConnect();
				invalidIdMock = sinon.mock( hooks );
				invalidIdMock.expects( "getById" )
					.resolves( undefined );
				return client.hook.update( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getById only", function() {
				invalidIdMock.verify();
			} );

			it( "should have returned duplicate error", function() {
				return response.should.partiallyEql( {
					status: 404,
					message: "Webhook test-hook not found"
				} );
			} );
		} );

		describe( "when error occurs", function() {
			var errorMock, response;
			before( function() {
				nock.enableNetConnect();
				errorMock = sinon.mock( hooks );
				errorMock.expects( "update" )
					.rejects( new Error( "Uh, how 'bout NO" ) );
				errorMock.expects( "getById" )
					.resolves( {} );
				return client.hook.update( { id: "test-hook" } )
					.then( undefined, function( result ) {
						response = result;
					} );
			} );

			it( "should have called hooks.getById and hooks.add", function() {
				errorMock.verify();
			} );

			it( "should have returned server error", function() {
				return response.should.partiallyEql( {
					status: 500,
					message: "Failed to update webhook"
				} );
			} );
		} );
	} );

	after( function() {
		host.stop();
		fount.purgeAll();
	} );
} );
