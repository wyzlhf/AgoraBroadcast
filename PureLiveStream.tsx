import React, { Component } from "react";
import {
	Alert,
	Button,
	PermissionsAndroid,
	Platform,
	StyleSheet, Text,
	View
} from "react-native";

import RtcEngine, {
	AudienceLatencyLevelType,
	ChannelProfile,
	ClientRole,
	RtcEngineContext,
	RtcLocalView,
	RtcRemoteView,
	VideoFrameRate,
	VideoOutputOrientationMode,
	VideoRenderMode
} from "react-native-agora";

const config = require("./agora.config.json");

interface State {
	role?: ClientRole;
	channelId?: string;
	isJoin: boolean;
	remoteUid?: number;
	isLowAudio: boolean;
}

export default class PureLiveStream extends Component<{}, State, any> {
	_engine?: RtcEngine;

	constructor(props: {}) {
		super(props);
		this.state = {
			isJoin: false,
			isLowAudio: true,
			role: ClientRole.Broadcaster
		};
		this._initEngine()
		console.log('构造函数中打印一些基本数据，打印开始###########################');
		console.log(this.state.role);
		console.log(this.state.isJoin);
		console.log('构造函数中打印一些基本数据，打印结束###########################')
	}

	componentWillUnmount() {
		this._engine?.destroy();
	}

	_initEngine = async () => {
		const { role } = this.state;
		if (Platform.OS === "android") {
			await PermissionsAndroid.requestMultiple([
				PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
				PermissionsAndroid.PERMISSIONS.CAMERA
			]);
		}
		this._engine = await RtcEngine.createWithContext(
			new RtcEngineContext(config.appId)
		);
		this._addListeners();

		// enable video module and set up video encoding configs
		await this._engine.enableVideo();

		// make this room live broadcasting room
		await this._engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
		await this._updateClientRole(role!);

		// Set audio route to speaker
		await this._engine.setDefaultAudioRoutetoSpeakerphone(true);

		// start joining channel
		// 1. Users can only see each other after they join the
		// same channel successfully using the same app id.
		// 2. If app certificate is turned on at dashboard, token is needed
		// when joining channel. The channel name and uid used to calculate
		// the token has to match the ones used for channel join
		await this._engine.joinChannel(
			config.token,
			config.channelId,
			null,
			123456789,
			undefined
		);
	};
	_addListeners = () => {
		this._engine?.addListener("Warning", (warningCode) => {
			console.info("Warning", warningCode);
		});
		this._engine?.addListener("Error", (errorCode) => {
			console.info("Error", errorCode);
		});
		this._engine?.addListener("JoinChannelSuccess", (channel, uid, elapsed) => {
			console.info("JoinChannelSuccess", channel, uid, elapsed);
			console.log("在addListener事件中，JoinChannelSuccess返回的数据：chanel");
			console.log(channel);
			console.log("在addListener事件中，JoinChannelSuccess返回的数据uid，这个主要看和观众的remoteUid是否一致：uid");
			console.log(uid);
			// RtcLocalView.SurfaceView must render after engine init and channel join
			this.setState({ isJoin: true });
			console.log("JoinChannelSuccess事件调用，用户加入Channel成功，isJoin变为TRUE，再次调用一下isJoin：");
			console.log(this.state.isJoin);

		});
		this._engine?.addListener("UserJoined", async (uid, elapsed) => {
			console.info("UserJoined", uid, elapsed);
			console.log("在UserJoined事件中，JoinChannelSuccess返回的数据uid，这个主要看和观众的remoteID是否一致，此处重置了remoteUid：uid");
			console.log(uid);
			this.setState({ remoteUid: uid });
		});
		this._engine?.addListener("UserOffline", (uid, reason) => {
			console.info("UserOffline", uid, reason);
			console.log("在UserOffline事件中，JoinChannelSuccess返回的数据uid，这个主要看和观众的remoteID是否一致，此处重置了remoteUid为undefined：uid");
			console.log(uid);
			this.setState({ remoteUid: undefined });
		});
	};

	_updateClientRole = async (role: ClientRole) => {
		await this._engine?.setVideoEncoderConfiguration({
			dimensions: {
				width: 640,
				height: 360
			},
			frameRate: VideoFrameRate.Fps30,
			orientationMode: VideoOutputOrientationMode.Adaptative
		});
		// enable camera/mic, this will bring up permission dialog for first time
		await this._engine?.enableLocalAudio(true);
		await this._engine?.enableLocalVideo(true);

		await this._engine?.setClientRole(role);
	};


	render() {
		const { isJoin } = this.state;
		return (
			<View style={styles.container}>

				{isJoin && this._renderVideo()}
			</View>
		);
	}

	_renderVideo = () => {
		const { role, remoteUid } = this.state;
		console.log('打印一下remoteUid，这里只有一个，但是问题在于多个直播，观众进来如何区分进入哪个直播？客户端其实是可以用navigation传递数据的')
		console.log(remoteUid)

		return (
			<View style={styles.container}>
				<RtcLocalView.SurfaceView
					style={styles.surfaceView}
					renderMode={VideoRenderMode.Hidden}
				/>
			</View>
		);
	}
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		// paddingBottom: 40,
	},
	float: {
		position: 'absolute',
		left: 0,
		bottom: 20,
		backgroundColor: 'gray',
	},

	surfaceView: {
		flex: 1,
	},
	button:{
		justifyContent:'center',
		alignItems:'center',
		height:60
	}
});
