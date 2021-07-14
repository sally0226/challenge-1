const express = require('express');

const Challenge = require('../models/challengeModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { ObjectID } = require('bson');
const db = mongoose.connection;
const { getCommitList } = require('./grassController')

const bcrypt = require('bcrypt');
const { checkPreferences } = require('joi');

async function CreateChallenge(req, res) {
	const { userId, name, challenge_start, challenge_end, private_key } = req.body;

	Challenge.create(userId, name, challenge_start, challenge_end, private_key)
		.then((doc) => {
			console.log("challenge 생성");
			console.log(doc._id);
			return doc._id
		})
		.catch((err) => {
			console.error(err);
			res.send('false');
		})
		.then(async (ch_id) => {
			_user = await User.findOneByUsername(userId)
			var chArray;
			chArray = _user.ch_list
			_challenge = await Challenge.findById(ch_id)
			chArray.push(_challenge._id);
			join(chArray)
		})

	const join = (chArray) => User.findOneAndUpdate({ "user_id": userId }, {
		$set: {
			ch_list: chArray,
		}
	}, { new: true, useFindAndModify: false }, (err, doc) => {
		if (err) {
			throw new Error('user DB에 ch_list 추가 오류')
		}
		else {
			console.log("user에 challenge 추가")
			console.log(doc)
			res.send('true')
		}
	})
		.catch((err) => {
			console.error(err);
			res.send('false');
		})
}

function WhoIsKing(req, res) {
	const challengeId = req.params.challengeId;
	const id = ObjectID(challengeId);


	Challenge.findById(id).then((chcommit) => {
		var commit = chcommit.commitCount;
		commit.sort(1);
	}, (err, doc) => {
		if (err) {
			console.log(err);
		} else {
			console.log("Challengekig :" + commit[1]);
			res.send(commit[1]);
		}
	})
}
function WhoIsPoor(req, res) {
	const challengeId = req.params.challengeId;
	const id = ObjectID(challengeId);


	Challenge.findById(id).then((chcommit) => {
		var commit = chcommit.commitCount;
		commit.sort(-1);
	}, (err, doc) => {
		if (err) {
			console.log(err);
		} else {
			console.log("Challengekig :" + commit[1]);
			res.send(commit[1]);
		}
	})
}


async function GetChallengeInfo(req, res) {
	const challengeId = req.params.challengeId;
	const id = ObjectID(challengeId);

	commitList = await Challenge.findById(id).then((ch) => { return ch.commitCount })
	const today = new Date()
	const _year = today.getFullYear()
	const _month = today.getMonth() + 1
	for (let i = 0; i < commitList.length; i++) {
		var _joinday = commitList[i].join_time
		var join_year = _joinday.getFullYear()
		var join_month = _joinday.getMonth() + 1
		var start = 0
		if (join_year === _year && join_month === _month) { start = _joinday.getDate() }	// 챌린지를 이번해에 가입했으면 start를 조정함.
		month_count = await getCommitList(commitList[i].user_id, challengeId, _year, _month)
		cnt = 0
		for (let j = start - 1; j < month_count[2].length; j++) {
			if (month_count[2][j] == true) { cnt += 1 }
		}
		commitList[i].count = cnt
	}

	await Challenge.findByIdAndUpdate(id, {
		$set: {
			commitCount: commitList
		}
	}, { new: true, useFindAndModify: false }, (err, doc) => {
		if (err) {
			console.log(err)
			res.send('false')
		}
		else {
			console.log("commitCount update!")
		}
	})

	Challenge.findById(id)
		.then((doc) => {
			console.log("challengeInfo 받음");
			console.log(doc._id)
			res.send(doc)
		})
		.catch((err) => {
			console.log(err)
			res.send(err)
		})

}


function FixChallengeInfo(req, res) {
	const challengeId = req.params.challengeId;
	const id = ObjectID(challengeId);
	var { name, challenge_start, challenge_end, challenge_leader, user_id, private_key } = req.body;

	Challenge.findOneById(challengeId)
		.then((ch) => {
			if (user_id === ch.challenge_leader) {
				changeInfo();
			} else {
				throw new Error('leader가 아님.')
			}
		})
		.catch((err) => {
			console.error(err);
			res.send('false')
		})

	const changeInfo = () => Challenge.findOneById(id).then((ch) => {
		var preChallenge = ch;
		if (name === undefined) {
			name = preChallenge.name;
		}
		if (challenge_start === undefined) {
			challenge_start = preChallenge.challenge_start;
		}
		if (challenge_end === undefined) {
			challenge_end = preChallenge.challenge_end;
		}
		if (challenge_leader === undefined) {
			challenge_leader = preChallenge.challenge_leader;
		}
		if (private_key === undefined) {
			private_key = preChallenge.private_key;
		}
	}).then(() => {
		Challenge.findByIdAndUpdate(id, {
			$set: {
				name: name,
				challenge_start: challenge_start,
				challenge_end: challenge_end,
				challenge_leader: challenge_leader,
				private_key: private_key
			}
		}, { new: true, useFindAndModify: false }, (err, doc) => {
			if (err) {
				console.log(err)
				res.send('false')
			}
			else {
				console.log("challenge 수정")
				console.log(doc._id)
				res.send('true')
			}
		})
	})
}

async function DeleteChallenge(req, res) {
	const challengeId = req.params.challengeId;
	const id = ObjectID(challengeId);

	userArray = await Challenge.findById(id).then((ch) => { return ch.challenge_users })
	for (let i = 0; i < userArray.length; i++) {
		list = await User.findOne({ user_id: userArray[i] }).then((user) => { return user.ch_list })
		await list.splice(list.indexOf(challengeId), 1);
		User.findOneAndUpdate({ user_id: userArray[i] }, {
			$set: {
				ch_list: list
			}
		}, { new: true, useFindAndModify: false }, (err, doc) => {
			if (err) {
				console.log(err)
				res.send('false')
			}
			else {
				console.log("user의 challengeList 수정")
				console.log(userArray[i])
			}
		})
	}
	Challenge.findByIdAndDelete(id, (err, doc) => {
		if (err) {
			console.log(err)
			res.send('false')
		}
		else {
			console.log("challenge 삭제")
			console.log(doc._id)
			res.send('true')
		}
	})
}

async function JoinChallenge(req, res) {
	const { userId, challengeId, private_key } = req.body;
	const id = ObjectID(challengeId);

	var userArray
	var userCount
	var newCommitCount

	const join_ch = (userArray, userCount, newCommitCount) => Challenge.findByIdAndUpdate(id, {
		$set: {
			challenge_users: userArray,
			challenge_user_num: userCount,
			commitCount: newCommitCount
		}
	}, { new: true, useFindAndModify: false }, (err, doc) => {
		if (err) {
			throw new Error('challenge DB에 user추가 오류')
		}
		else {
			console.log("challenge에 user 추가")
			console.log(doc._id)
		}
	})
		.catch((err) => {
			console.error(err);
			res.send('false');
		})

	const join_user = (chArray) => User.findOneAndUpdate({ "user_id": userId }, {
		$set: {
			ch_list: chArray,
		}
	}, { new: true, useFindAndModify: false }, (err, doc) => {
		if (err) {
			throw new Error('user DB에 ch_list 추가 오류')
		}
		else {
			console.log("user에 challenge 추가")
			console.log(doc)
			res.send('true')
		}
	})
		.catch((err) => {
			console.error(err);
			res.send('false');
		})

	const join = async (challenge) => {
		if (challenge === null) {
			console.log('not exist challenge')
			res.send('false')
		}

		userArray = challenge.challenge_users
		userCount = challenge.challenge_user_num + 1

		for (let i = 0; i < userArray.length; i++) {
			if (userArray[i] === userId) {
				console.log('이미 가입되어 있음')
				res.send('false')
			}
		}
		userArray.push(userId)

		//commitCount 추가
		newCommitCount = challenge.commitCount
		const addCommitCount = challenge.commitCount.create({ user_id: userId })
		newCommitCount.push(addCommitCount)


		join_ch(userArray, userCount, newCommitCount)

		user = await User.findOneByUsername(userId)
		if (user === null) {
			console.log('user가 존재하지 않음.')
			res.send('false')
		}
		var chArray;
		chArray = user.ch_list
		if (chArray.indexOf(challengeId) >= 0) {	// 이미 해당 Id의 challenge에 가입되어 있는지 확인.
			console.log('already join')
			res.send('false')
		}
		chArray.push(challengeId);

		join_user(chArray)
	}

	const challenge = await Challenge.findById(id)
	if (challenge.private_key === private_key) join(challenge)
	else {
		console.log('private_key different!')
		res.send('false')
	}
	chArray.push(challengeId);

	join_user(chArray)
}

function OutChallenge(req, res) {
	const { userId, challengeId } = req.body;
	const id = ObjectID(challengeId);

	var userArray
	var userCount
	var newCommitCount

	Challenge.findOneById(id)
		.then((challenge) => {
			userArray = challenge.challenge_users
			userCount = challenge.challenge_user_num - 1

			for (let i = 0; i < userArray.length; i++) {
				if (userArray[i] === userId) {
					userArray.pop(i)

					//commitCount 삭제
					challenge.commitCount.id(userId).remove();
					newCommitCount = challenge.commitCount
					return 1;
				}
			}
			return 0;

		})
		.then((state) => {
			if (state === 0)
				throw new Error('challenge DB에 해당 user 없음.')
			out(userArray, userCount, newCommitCount)

		})
		.catch((err) => {
			console.error(err);
			res.send('false');
		})

	const out = (userArray, userCount, newCommitCount) => Challenge.findByIdAndUpdate(id, {
		$set: {
			challenge_users: userArray,
			challenge_user_num: userCount,
			commitCount: newCommitCount
		}
	}, { new: true, useFindAndModify: false }, (err, doc) => {
		if (err) {
			console.log(err)
			res.send('false')
		}
		else {
			console.log("challenge에 user 삭제")
			console.log(doc._id)
			res.send('true')
		}
	})
}

function InviteUser(req, res) {

}

module.exports = {
	whoIsKing: WhoIsKing,
	whoIsPoor: WhoIsPoor,
	createChallenge: CreateChallenge,
	getChallengeInfo: GetChallengeInfo,
	fixChallengeInfo: FixChallengeInfo,
	deleteChallenge: DeleteChallenge,
	joinChallenge: JoinChallenge,
	outChallenge: OutChallenge,
	inviteUser: InviteUser
};