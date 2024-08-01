
let s = 0;
let $width, $height;
let $id_show = $('#id_show');
let $question_order = 0; // 目前題序
let $answered = 0;
let $room_score = 0;
let $n = 0;
let $countdown_inter; // 倒數事件
let $answer_type; // 答型

// let $question_id; // 題號

let $Q = [];

//
let in_room_id, dealer, playing, room_people, vid;
let check_run = '';
let show_log = true;

if (window.localStorage.status === undefined) {
    window.localStorage.status = '0';
}


// ============================================================================== //

mc.onMessageArrived = function (message) {
    // 正确 ： console.log("Received message: " + message***.payloadBytes.*t**oString());
    // 错误： console.log("Received message: " + message.payloadString);

    //
    let m = message.payloadString;
    // let m = message.payloadBytes.toString();
    let j = JSON.parse(m);
    // if ( j['command'] !=='server_dealer' )

    check_run = j['command'];

    if (show_log) console.log(m, j);

    // ping pong
    if (j['command'] === 'pong') {
    }

    // 重開新局
    if (j['command'] === 'reset_game_ok') {
        window.localStorage.in_room = '';
        window.localStorage.status = '0';

        // 退訂房間
        mc.unsubscribe('MOPCON2024HOYO/room/' + j['room_id'], {
            onFailure: function () {},
            onSuccess: function () {
                console.log(j['room_id'] + " room unsubscribe success!");
            }
        });

        // 訂閱大廳
        mc.subscribe('MOPCON2024HOYO/lobby', {
            onSuccess: function (){
                console.log('lobby subscribe');
            },
            onFailure: function (){}
        });

        // window.location.reload();
        window.location.replace(url.origin + url.pathname);
    }

    // 勝利
    if (j['command'] === 'win_ok') {
        $('.area').hide();
        $('#area_win').show();
        // $('#id_win_username').text(j['user_name']);

        let u = '';
        $.each(j['user_list'], function (k, v) {
            u += '<span style="display: block; width: 90%; background-color: #f7aee4b3;">' + v['user_name'] + ' : ' + number_format(v['score'], 1, '.', '') + '</span>';
        });

        $('#id_win_username').html(u);
    }

    if (j['command'] === 'score_ok') {
        $('#id_score').html(j['score']);
    }

    // 交卷
    if (j['command'] === 'finish_ok') {

        $('.modal').modal('hide');
        window.clearInterval($countdown_inter);

        // 學生
        if ( j['identity'] ==='player' ){
            $('.area').hide();
            $('#area_player_finish').show();

            let h = '';
            $.each( j['total_score'], function (k,v){
                h += '<div class="row text-center">';
                h += '<div class="col" style="font-size: 1.5rem;">'+ v['Name'] +' : <span style="background-color: #e3dc33; color: #fff; font-size: 1.5rem; border-radius: 16px; padding: 0 12px;">'+ number_format(v['total_score'], 2) +'</span></div>';
                h += '</div>';
            } );
            $('.rankings').html(h);

            // let $Q = JSON.parse(JSON.parse(j['question']['Question']));
            // parse_show_question($Q);
        }

        // viewer
        if ( j['identity'] ==='viewer' ){
            $('.area').hide();
            $('#area_view_finish').show();

        }

        $('.finish_question_list').html( parse_show_question(j['question']) );
    }

    // 接收作答
    if (j['command'] === 'answer_ok') {
        // $('.div_answer').attr("disabled", true);
        // $('.user_total_score').html(number_format(j['total_score'], 2));
        // $('.user_question_score').html(number_format(j['score'], 2));
    }

    // 接收統計
    if (j['command'] === 'question_answer_statistics_ok') {
        let r = '';

        $('#id_player_question_answer').html(j['answer']['total']);

        $('#id_player_answer_correct').html(j['answer']['correct']);

        $('#id_player_answer_wrong').html(j['answer']['wrong']);
    }

    // 接收試題
    if (j['command'] === 'question_ok') {

        $('#id_form_player').find('.student_answer,button').prop('disabled', false);
        $.LoadingOverlay("hide");

        $('.question_count').each(function (k,v){
            // console.log(k);
            if ( parseInt(j['order']) === (k+1) ) {
                $(this).addClass('active');
            }
            else{
                $(this).removeClass('active');
            }
        });

        let $Q = JSON.parse(j['question']);
        // console.log($Q);

        $question_order = j['order'];

        $answered = 0;
        show_question($Q);
    }

    // 重新整理時  取得目前玩家狀態
    if (j['command'] === 'get_status_ok') {

        $identity = j['identity'];

        console.log(date('Y-m-d H:i:s'), j['room_id']);

        if ( j['room_id'] === '' || j['room_id'] === null || j['room_id'] === undefined ) {
            window.localStorage.status = '0';
            window.localStorage.in_room = '';
            // window.location.reload();
        }

        // 檢查房間是否消失
        if ( parseInt(window.localStorage.status) === 2 ){
            if ( j['room_id'] === null || j['room_id'] !== window.localStorage.in_room ) {
                window.localStorage.status = '0';
                // window.location.reload();
            }
        }

        // 中途退出  重新進入
        if (window.localStorage.in_room === j['room_id'] && j['room_status'] === 1) {

            // 退出大廳
            mc.unsubscribe('MOPCON2024HOYO/lobby', {
                onSuccess: function () {
                    console.log("lobby unsubscribe");
                },
            });

            // 訂閱房間
            mc.subscribe('MOPCON2024HOYO/room/' + j['room_id'], {
                onSuccess: function (){
                    console.log(j['room_id'] + ' room subscribe');
                },
            });

            $('.area').hide();

            // 儲存題號
            // $question_id = j['question']['Question']['question_code'];

            $room_score = j['room']['AnswerTime'];

            console.log(j['identity']);

            // HOST
            if ( j['identity'] === 'viewer' ) {
                $('#area_view').show();

                if ( $_GET('order') ) {
                    console.log('order');
                    let message = new Paho.MQTT.Message(JSON.stringify({
                        command: "set_order",
                        room_id: window.localStorage.in_room,
                        order: $_GET('order'),
                    }));
                    message.destinationName = "MOPCON2024HOYO/server";
                    mc.send(message);
                }
                else if( $_GET('analyze') ){
                    console.log('analyze');
                }
                else {
                    console.log('aaa');

                    viewer_home(j);

                    $.LoadingOverlay("show", {
                        background: "rgba(100,100,100,0.1)",
                        size: "8",
                        imageAnimation : "3000ms rotate_right",
                        fade : false,
                    });

                    let message = new Paho.MQTT.Message(JSON.stringify({
                        command: "question",
                        room_id: window.localStorage.in_room,
                        order: parseInt(j['room']['NowQuestion']),
                    }));
                    message.destinationName = "MOPCON2024HOYO/server";
                    mc.send(message);
                }
            }

            // 玩家
            if ( j['identity'] === 'player' ) {
                $('#area_play').show();

                $('.user_total_score').html(number_format(j['total_score'], 2));
                $answered = j['answered'];

                $.LoadingOverlay("show", {
                    background: "rgba(100,100,100,0.1)",
                    size: "8",
                    imageAnimation : "3000ms rotate_right",
                    fade : false,
                });

                let message = new Paho.MQTT.Message(JSON.stringify({
                    command: "question",
                    room_id: window.localStorage.in_room,
                    order: parseInt(j['room']['NowQuestion']),
                }));
                message.destinationName = "MOPCON2024HOYO/server";
                mc.send(message);
            }

            // $question_order = j['question']['Order'];
            // $('.question_count').eq($question_order-1).addClass('active');

            // console.log(j['question'][0]['Question']);
            // let $Q = JSON.parse(j['question']['Question']);
            // console.log($Q);
            // show_question($Q);
        }

        else {
            if (window.localStorage.username) {
                get_lobby();
            }
            else {
                $('.area').hide();
                $('#area_join').show();
            }
        }
    }

    //
    if (j['command'] === 'join_ok') {
        $('.area').hide();
        $('#area_room').show();
        get_lobby();
    }

    // in room
    if ( j['command'] === 'in_room_ok' ) {

        window.localStorage.status = '2';
        window.localStorage.in_room = j['room_id'];

        // 退出大廳
        mc.unsubscribe('MOPCON2024HOYO/lobby', {
            onSuccess: function () {
                console.log("lobby unsubscribe");
            },
        });

        // 訂閱房間
        mc.subscribe('MOPCON2024HOYO/room/' + j['room_id'], {
            onSuccess: function () {
                console.log(j['room_id'] + ' room subscribe');

                $('.area').hide();

                // 玩家
                // if ( j['identity'] === 'player' ) {
                //     $('#area_play').show();
                // }


                if ( j['room'] ){
                    if ( j['room']['Status'] === 1 ) {
                        $('#area_play').show();

                        $.LoadingOverlay("show", {
                            background: "rgba(100,100,100,0.1)",
                            size: "8",
                            imageAnimation : "3000ms rotate_right",
                            fade : false,
                        });

                        let message = new Paho.MQTT.Message(JSON.stringify({
                            command: "question",
                            room_id: window.localStorage.in_room,
                            order: j['room']['NowQuestion'],
                        }));
                        message.destinationName = "MOPCON2024HOYO/server";
                        mc.send(message);
                    }
                }
                else{
                    $('#area_room_wait').show();
                    $('.wait_message').hide();
                    $('#id_wait_message_ok').show();
                    $('#id_wait_peoples').html(j['peoples']);
                }

                // $room_score = j['room']['AnswerTime'];
                //
                // $question_order = j['question']['Order'];
                // $('.question_count').eq($question_order-1).addClass('active');
                //
                // // console.log(j['question'][0]['Question']);
                // let $Q = JSON.parse(j['question']['Question']);
                // // console.log($Q);
                // show_question($Q);
            }
        });

    }

    if ( j['command'] === 'in_room_error' ) {

        if (window.localStorage.username == null || window.localStorage.username === '' || window.localStorage.username === undefined) {
            $('.area').hide();
            $('#area_join').show();
        }
        else {
            $('.area').hide();
            $('#area_room_wait').show();
            $('.wait_message').hide();
            $('#id_wait_message_error').show();
        }
    }

    // $_GET('order')
    if (j['command'] === 'set_order_ok' ) {
        viewer_home(j);

        let message = new Paho.MQTT.Message(JSON.stringify({
            command: "question",
            room_id: window.localStorage.in_room,
            order: j['room']['NowQuestion'],
        }));
        message.destinationName = "MOPCON2024HOYO/server";
        mc.send(message);
    }

    // 大廳 房間使用者列表
    if (j['command'] === 'get_room_user_ok' ) {
        let room_people = '';
        $.each(v['room_user'], function (k,v){
            room_people += '<span class="user_list_user_name">'+ v['user_name'] +'</span>';
        });

        $('#id_room_'+ v['room_id'] +'_user').html(room_people);
    }

    // 大廳
    if (j['command'] === 'get_lobby_ok' ) {

        $('.area').hide();
        $('#area_room').show();

        $('#room_list').html('');

        $.each(j['room_list'], function (k, v) {

            console.log(v);
            room_people = '';

            room_people += '<div class="room">';

            let $subject = '';

            if ( v['room_id'] === window.localStorage.client_id ) room_people += '<div class="text-end"><button class="btn btn-outline-danger col-4" onclick="reset_game(\''+ v['room_id'] +'\')">刪除此空間</button></div>';

            room_people += '<div style="min-height: 36px;"><span class="fa-stack" style="vertical-align: middle; --fa-inverse: #1da1f2;"><i class="fa-solid fa-circle fa-stack-2x"></i><i class="fa-solid fa-shop fa-stack-1x fa-inverse"></i></span> ' + v['name'] + '</div>';

            let qrcode_url = url.origin + url.pathname + '?room_id=' + v['room_id'];
            room_people += '<div class="" style="min-height: 36px;"><button class="btn btn-warning" onclick="modal_qrcode(\''+ qrcode_url +'\')">QR code</button></div>';

            room_people += '<div id="id_' + v['room_id'] + '_player" class="row mt-2">';

            player_in_room = 0;

            let obj = check_users_array(v['room_user'], client_id);
            console.log(v['room_user'], client_id, obj);

            if ( obj['user_name'] ) {
                room_people += '<div class="col-12">';
                room_people += '<div class="room_people" style="box-shadow: inset 0 0 8px 6px #aba9c0;">';
                room_people += '<div class="' + v['room_id'] + '" style="color: #999;">'+ obj['user_name'] +'</div>';
                room_people += '</div>';
                room_people += '</div>';
            }
            else{
                // 非主人
                if (v['room_id'] !== window.localStorage.client_id) {
                    room_people += '<div class="col-12" onclick="in_room(\'' + v['room_id'] + '\')">';
                    room_people += '<div class="room_people">';
                    room_people += '<div class="' + v['room_id'] + '" style="color: #999;">加入</div>';
                    room_people += '</div>';
                    room_people += '</div>';
                }
            }

            room_people += '</div>';

            //
            if (v['room_id'] === window.localStorage.client_id) {
                room_people += '<div class="col-12"><button class="btn btn-primary col-12" style="height: 3rem;" onclick="start_game(\'' + v['room_id'] + '\')">開始</button></div>';
            }

            // 所有人列表
            room_people += '<div id="id_room_'+ v['room_id'] +'_user" class="mt-3 px-3 py-2 shadow-sm" style="max-height: 64px; overflow-y: auto;">';
            $.each(v['room_user'], function (k,v){
                room_people += '<span class="user_list_user_name">'+ v['user_name'] +'</span>';
            });
            room_people += '</div>';

            //
            room_people += '</div>';

            if ( $_GET('room_id') ===null ) {
                $('#room_list').append(room_people);
            }
            else{
                in_room(v['room_id']);
            }
        });

        //
        if ( j['room_list'] !== undefined ) {
            if (j['room_list'].length === 0) {
                $('#room_list').html('<div class="p-3 shadow mt-4">目前沒有活動</div>');
            }
        }
    }

    //
    if (j['command'] === 'create_room_ok') {

        $.LoadingOverlay("hide");

        // 訂閱房間
        mc.subscribe('MOPCON2024HOYO/room/' + j['room_id'], {
            onSuccess: function () {
                console.log(j['room_id'] + " room subscribe success!");
            }
        });

        $('#modal_create_room').modal('hide');
        get_lobby();
    }

    //
    if (j['command'] === 'start_game_ok') {

        window.localStorage.status = '2';

        // 退出大廳
        mc.unsubscribe('MOPCON2024HOYO/lobby', {
            onSuccess: function () {
                console.log("lobby unsubscribe");
            },
        });

        // 訂閱房間
        mc.subscribe('MOPCON2024HOYO/room/' + j['room_id'], {
            onSuccess: function () {
                console.log(j['room_id'] + " room subscribe success!");

                $('.area').hide();

                // HOST
                if ( j['identity'] === 'viewer' ) {
                    window.localStorage.in_room = j['room_id'];
                    $('#area_view').show();
                    viewer_home(j);
                }

                // 玩家
                if ( j['identity'] === 'player' ) {
                    $('#area_play').show();
                }

                $room_score = j['room']['AnswerTime'];

                $question_order = j['question']['Order'];
                $('.question_count').eq($question_order-1).addClass('active');

                // console.log(j['question'][0]['Question']);
                let $Q = JSON.parse(j['question']['Question']);
                // console.log($Q);
                show_question($Q);
            }
        });

    }

    //
    if (j['command'] === 'parse_question_ok') {

        window.clearInterval($countdown_inter);

        if ( j['identity'] ==='player' ) {
            $('#modal_parse_question').modal('show');

            $('.parse_correct_answer').html(j['correct_answer']);
            $('.parse_player_answer').html(j['player_answer']);
            $('.user_total_score').html(number_format(j['total'], 2));
            $('.user_question_score').html(number_format(j['score'], 2));
        }

        //
        if ( j['identity'] ==='viewer' ) {
            $('#id_viewer_parse_message').html('執行 ok');
        }
    }

}

function modal_qrcode($url){
    $('#id_qrcode').html('');
    $('#id_qrcode_text').html('<a href="'+ $url +'">'+ $url +'</a>');
    $('#modal_qrcode').modal('show');

    let qrcode_size = (window.innerWidth >= window.innerHeight - 36? window.innerHeight -36 :window.innerWidth) -80;
    let qrcode = new QRCode('id_qrcode', {
        text: $url,
        width: qrcode_size,
        height: qrcode_size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L // 由低到高 L M Q H
    });
}

// 得分顯示 解析
function parse_question(){
    let message = new Paho.MQTT.Message(JSON.stringify({
        command: "parse_question",
        room_id: window.localStorage.in_room,
        order: $question_order,
    }));
    message.destinationName = "MOPCON2024HOYO/server";
    mc.send(message);
}

function next(){
    let message = new Paho.MQTT.Message(JSON.stringify({
        command: "question",
        room_id: window.localStorage.in_room,
        order: parseInt($question_order) +1,
    }));
    message.destinationName = "MOPCON2024HOYO/server";
    mc.send(message);
}

//
function viewer_home(j){

    // 題數
    let r = '';
    for( let $question_count = 1; $question_count <= parseInt(j['room']['QuestionNumber']); $question_count++ ){
        r += '<div class="question_count" data-value="'+ $question_count +'">'+ $question_count +'</div>';
    }
    r += '<div class="d-inline-block mx-2" style=""><button class="btn btn-success btn-lg" onclick="finish()">交卷</button></div>';

    $('#id_view_question_number').html(r);

    console.log(parseInt(j['room']['NowQuestion']));

    // 點選試題
    $('.question_count').each(function (k,v){
        console.log(k);
        if ( parseInt(j['room']['NowQuestion']) === (k+1) ) {
            $(this).addClass('active');
        }
        else{
            $(this).removeClass('active');
        }
    }).on( "click", function() {
        $.LoadingOverlay("show", {
            background: "rgba(100,100,100,0.1)",
            size: "8",
            imageAnimation : "3000ms rotate_right",
            fade : false,
        });

        let message = new Paho.MQTT.Message(JSON.stringify({
            command: "question",
            room_id: window.localStorage.in_room,
            order: $(this).data('value'),
        }));
        message.destinationName = "MOPCON2024HOYO/server";
        mc.send(message);
    } );

    $('.total_player').html(j['room']['JoinPlayer']);
}

// 交卷
function finish(){
    let message = new Paho.MQTT.Message(JSON.stringify({
        command: "finish",
        room_id: window.localStorage.in_room,
    }));
    message.destinationName = "MOPCON2024HOYO/server";
    mc.send(message);
}

//
function show_question($Q){

    console.log($Q);
    // type 1=單選 2=多選
    // purpose 1=提問 2=資料收集

    // 將上一題清空
    $('.modal').modal('hide');
    $('#id_viewer_parse_message').html('');

    //
    let choice = explode(',', $Q['options']);
    let answer_player='', answer_host='';

    $('.show_question').html($Q['question']);

    $answer_type = $Q['type'];

    $.each($Q['answer'], function (k, v) {
        if ( $Q['type'] === 1 ) {
            answer_player += '<input type="radio" id="answer_radio_' + k + '" class="btn-check student_answer" name="answer" value="' + (k + 1) + '" data-validation-engine="validate[required]"> <label for="answer_radio_' + k + '" class="btn btn-light py-3 border mb-1 d-block">' + v + '</label>';

            answer_host += '<input type="radio" id="answer_radio_host_' + (k + 1) + '" class="btn-check" name="options-outlined" value="' + (k + 1) + '" autocomplete="off"> <label for="answer_radio_host_' + (k + 1) + '" class="btn btn-light mb-2 d-block">' + v + '</label>';

            // answer += '<button type="button" class="btn text-start mt-2 btn btn-outline-secondary w-100 div_answer" data-value="' + (k + 1) + '"><div class="d-inline-block float-left align-top">' + v + '</div></button>';
        }

        if ( $Q['type'] === 2 ) {
            answer_player += '<input type="checkbox" id="answer_checkbox_' + k + '" class="btn-check student_answer" name="answer[]" value="' + (k + 1) + '" data-validation-engine="validate[required]"><label for="answer_checkbox_' + k + '" class="btn btn-light py-3 border mb-1 d-block">' + v + '</label>';

            answer_host += '<input type="checkbox" id="answer_checkbox_host_' + k + '" class="btn-check student_answer" name="answer[]" value="' + (k + 1) + '" data-validation-engine="validate[required]"><label for="answer_checkbox_host_' + k + '" class="btn btn-light py-3 border mb-1 d-block">' + v + '</label>';

            // answer += '<button type="button" class="btn text-start mt-2 btn btn-outline-secondary w-100 div_answer" data-value="' + (k + 1) + '"><div class="d-inline-block float-left align-top">' + v + '</div></button>';
        }
    });


    $('#id_answer_host').html(answer_host);
    $('#id_answer_player').html(answer_player);

    $("#id_form_player").submit(null).validationEngine({
        onValidationComplete: function (form, status) {
            if (status === true) {

                window.clearInterval($countdown_inter);

                let student_answer = '';

                if ( $answer_type === 1 ) {
                    student_answer = $('#id_form_player').find('.student_answer:checked').val();
                }

                if ( $answer_type === 2 ) {
                    $('#id_form_player').find('.student_answer:checked').each(function (k,v){
                        student_answer += $(this).val() + ',';
                    });
                }

                student_answer = trim(student_answer , ',');

                $('#id_form_player').find('.student_answer,button').prop('disabled', true);

                let message = new Paho.MQTT.Message(JSON.stringify({
                    command: "answer",
                    room_id: window.localStorage.in_room,
                    user_id: window.localStorage.client_id,
                    order: $question_order,
                    answer: student_answer,
                }));
                message.destinationName = "MOPCON2024HOYO/server";
                mc.send(message);
            }
        },
        validationEventTrigger: '',
        autoHidePrompt: true,
        autoHideDelay: 2000,
        promptPosition: "bottomLeft",
        validateNonVisibleFields: false,
        prettySelect: true,
        scroll: false
    });

    $('html, body').animate({
        scrollTop: 0
    }, 100);

    // 已回答
    // if ( $answered === 1 ) $('.div_answer').attr("disabled", true);

    // $('#id_player_score').html('0');
    $n = 0;
    countdown();

    // 作答
    // $('.player .div_answer').on( "click", function(){
    //
    //     $('.div_answer').removeClass('active');
    //     $(this).addClass('active');
    //
    //     let message = new Paho.MQTT.Message(JSON.stringify({
    //         command: "answer",
    //         room_id: window.localStorage.in_room,
    //         user_id: window.localStorage.client_id,
    //         order: $question_order,
    //         answer: $(this).data('value'),
    //     }));
    //     message.destinationName = "MOPCON2024HOYO/server";
    //     mc.send(message);
    // });
}

function countdown() {
    if ( $n === 0 ) {
        window.clearInterval($countdown_inter);

        $n = $room_score;
        $countdown_inter = setInterval(function () {
            if ($n > 0)
                $('#id_player_score').html(number_format($n -= 0.01, 2));
            else {
                $('#id_player_score').html('0');
                window.clearInterval($countdown_inter);
            }
        }, 10);
    }
    else{
        $room_score = $n;
    }
}

//
function parse_show_question($json){

    let $r = '';

    $.each( $json, function (k, v){

        // console.log(v);

        let $Q = JSON.parse(v['Question']);

        console.log($Q);

        $r += '<hr>';
        $r += '<div>'+ $Q['question'] +'</div>';

        let correct = '';
        $.each($Q['answer'], function (k, v) {
            correct = '';
            $.each( $Q['correct_answer'], function (kk, kv){
                if ( (k+1) === parseInt(kv) ){
                    correct = 'correct_answer';
                }
            } );
            $r += '<div class="text-start mt-2 '+ correct +'" style="display: flex !important; align-items: center;" ><span class="float-left" style="">' + (k+1) +'.</span><div class="d-inline-block float-left align-top" style="margin-left: 0.5rem;">' + v + '</div></span></div>';
        });

        // 是否題  答項
        // if ( $Q['type_code'] === '39' ) {
        //     $r += '<div class="row">';
        //     $r += '<div class="col-6 text-center div_answer"><span class="float-left"></span><div class=" btn btn-danger col-11 btn-lg d-inline-block float-left align-top" style="font-size: 2.5rem; height: 3rem;">x</div></div>';
        //     $r += '<div class="col-6 text-center div_answer"><span class="float-left"></span><div class="btn btn-success col-11 btn-lg d-inline-block float-left align-top" style="font-size: 2.5rem; height: 3rem;">o</div></div>';
        //     $r += '</div>';
        // }
        // else{
        //     let choice = explode(',', $Q['options']);
        //
        //     if ( $Q['status_flag'] === '1' ) {
        //
        //
        //         $.each($Q['answer'], function (k, v) {
        //             let $correct_answer = ($Q['correct_answer'] === choice[k])? choice[k] : '';
        //             $r += '<div class="text-start mt-2" style="display: flex !important; align-items: center;" ><span class="float-left" style="width: 30px; font-size: 1.5rem;">' + $correct_answer + '</span><span class="float-left">' + choice[k] + '</span><span class="float-left"><div class="d-inline-block float-left align-top" style="margin-left: 0.5rem;">' + v + '</div></span></div>';
        //         });
        //     }
        //
        //     // 圖
        //     else{
        //
        //         $r += '<div><img src="data:image/png;base64, ' + $Q['question'] + '" alt="" style="max-width: calc( 100% - 32px );"></div>';
        //
        //         $.each($Q['answer'], function (k, v) {
        //             let $correct_answer = ($Q['correct_answer'] === choice[k])? choice[k] : '';
        //             $r += '<div class="text-start mt-2" style="display: flex !important; align-items: center;"><span class="float-left" style="width: 30px; font-size: 1.5rem;">' + $correct_answer + '</span><span class="float-left">' + choice[k] + '</span><span class="float-left"><div class="d-inline-block float-left align-top" style="margin-left: 0.5rem;"><img src="data:image/png;base64, ' + v + '" alt="" style="max-width: calc( 100% - 32px );"></div></span></div>';
        //         });
        //     }
        // }

        // console.log($r);
    } );

    return $r;
}

function get_lobby() {
    let message = new Paho.MQTT.Message(JSON.stringify({
        command: "get_lobby",
        user_id: window.localStorage.client_id,
    }));
    message.destinationName = "MOPCON2024HOYO/server";
    mc.send(message);
}

// 開啟創建房間 modal
function modal_create_room($id, obj) {
    let $this = $(obj);
    group_count = $this.find('.group_count').text();
    console.log(group_count);

    $('#id_form_create_room').find('[name="id"]').val($id);

    // 顯示
    $('#modal_create_room').modal('show');
}

//
function make_id(length) {
    let result = '';
    const characters = '012345679';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

// 房間隨機名稱
function random_room_name(){
    $('#id_create_room_name').val(make_id(6));
}

//
function start_game() {
    let message = new Paho.MQTT.Message(JSON.stringify({
        command: "start_game",
        room_id: room_id,
        user_id: client_id,
    }));
    message.destinationName = "MOPCON2024HOYO/server";
    mc.send(message);
}

// 重新遊戲
function reset_game($room_id) {
    $room_id = $room_id || window.localStorage.in_room;

    if (confirm('確定？')) {
        let message = new Paho.MQTT.Message(JSON.stringify({
            command: "reset_game",
            room_id: $room_id,
        }));
        message.destinationName = "MOPCON2024HOYO/server";
        mc.send(message);
    }
}

//
function end_game() {
}

//
function submit_create_room() {
    $('#id_form_create_room').submit();
}

//
function in_room($id) {
    let message = new Paho.MQTT.Message(JSON.stringify({
        command: "in_room",
        user_id: window.localStorage.client_id,
        name: window.localStorage.username,
        room_id: $id,
    }));
    message.destinationName = "MOPCON2024HOYO/server";
    mc.send(message);
}

function check_users_array(arr, $id) {
    let r = {};
    $.each(arr, function (k, v) {
        if (v['user_id'] === $id) {
            r['user_name'] = v['user_name'];
        }
    });
    return r;
}

function refresh() {
    window.location.reload();
}

$("#id_form_join").submit(null).validationEngine({
    onValidationComplete: function (form, status) {
        if (status === true) {

            let $username = $('#id_join').val();

            window.localStorage.username = $username;

            let message = new Paho.MQTT.Message(JSON.stringify({
                command: "join",
                user_id: window.localStorage.client_id,
                username: $username,
            }));
            message.destinationName = "MOPCON2024HOYO/server";
            mc.send(message);
        }
    },
    validationEventTrigger: '',
    autoHidePrompt: true,
    autoHideDelay: 2000,
    promptPosition: "bottomLeft",
    validateNonVisibleFields: false,
    prettySelect: true,
    scroll: false
});

$("#id_form_create_room").submit(null).validationEngine({
    onValidationComplete: function (form, status) {
        if (status === true) {

            $.LoadingOverlay("show", {
                background: "rgba(100,100,100,0.6)",
                size: "8",
                imageAnimation : "3000ms rotate_right",
                fade : false,
            });

            let message = new Paho.MQTT.Message(JSON.stringify({
                command: "create_room",
                user_id: window.localStorage.client_id,
                name: $('#id_create_room_name').val(),
                room_id: window.localStorage.client_id,
                subject: $('#id_set_subject option:selected').text(),
                question_number: $('#id_question_number').val(),
                answer_time: $('#id_answer_time').val(),
            }));
            message.destinationName = "MOPCON2024HOYO/server";
            mc.send(message);

            $(document).scrollTop(0);

        }
    },
    validationEventTrigger: '',
    autoHidePrompt: true,
    autoHideDelay: 2000,
    promptPosition: "bottomLeft",
    validateNonVisibleFields: false,
    prettySelect: true,
    scroll: false
});

// ------------------------------------------------------------------------
// 選單
function darken_screen(yesno) {
    if (yesno === true) {
        document.querySelector('.screen-darken').classList.add('active');
    } else if (yesno === false) {
        document.querySelector('.screen-darken').classList.remove('active');
    }
}

function close_offcanvas() {
    darken_screen(false);
    document.querySelector('.mobile-offcanvas.show').classList.remove('show');
    document.body.classList.remove('offcanvas-active');
}

function show_offcanvas(offcanvas_id) {
    darken_screen(true);
    document.getElementById(offcanvas_id).classList.add('show');
    document.body.classList.add('offcanvas-active');
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('[data-trigger]').forEach(function (everyelement) {

        let offcanvas_id = everyelement.getAttribute('data-trigger');

        everyelement.addEventListener('click', function (e) {
            e.preventDefault();
            show_offcanvas(offcanvas_id);

        });
    });

    document.querySelectorAll('.btn-close').forEach(function (everybutton) {

        everybutton.addEventListener('click', function (e) {
            e.preventDefault();
            close_offcanvas();
        });
    });

    document.querySelector('.screen-darken').addEventListener('click', function (event) {
        close_offcanvas();
    });

});

//
$(function () {

    // if ( $role <= 20 ){
    $('#id_create_room_button').show();
    // }

    // 檢查 MQTT 服務是否啟動
    setTimeout(function (k, v) {
        if (check_run === '') {
            $('.area').hide();
            $('#area_message').show();
            $('#id_message').html('<div class="mt-5 text-center"><div>主機連線失敗！</div><div class="mt-3"><a href="javascript:void(0)" onclick="window.location.reload()">重新整理</a></div></div>');
        }
    }, 8000);

});
