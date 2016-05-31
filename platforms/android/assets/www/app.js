// Short name for nRF51-DK BLE library.
var nRF51_ble = evothings.nRF51_ble;
var led_state = 0; // we need to store the state to turn on/off LED's
var deviceName = 'Nordic_HRM'
// Application object.
var app = {};

// Connected device.
app.device = null;
// current heart rate
app.heartRate = 0;
// drawing
app.dataPoints = [];

app.drawLines = function(dataArray) {
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	var dataPoints = app.dataPoints;

	dataPoints.push(dataArray);
	if (dataPoints.length > canvas.width)
	{
		dataPoints.splice(0, (dataPoints.length - canvas.width));
	}

	var magnitude = 400;

	function calcY(i)
	{
		return canvas.height - (i * canvas.height) / magnitude;
	}

	function drawLine(offset, color)
	{
		context.strokeStyle = color;
		context.beginPath();
		context.moveTo(0, calcY(dataPoints[dataPoints.length-1][offset]));
		var x = 1;
		for (var i = dataPoints.length - 2; i >= 0; i--)
		{
			var y = calcY(dataPoints[i][offset]);
			context.lineTo(x, y);
			x++;
		}
		context.stroke();
	}

	context.clearRect(0, 0, canvas.width, canvas.height);
	drawLine(0, '#f00');
};
/**
 * Called when HTML page has been loaded.
 */
$(document).ready( function()
{
	// Adjust canvas size when browser resizes
	$(window).resize( respondCanvas );

	// Adjust the canvas size when the document has loaded.
	respondCanvas();

	// get data from server
	function getData() {
		// AJAX callback
		function onDataReceived(jsonData) {
			$('#timer').html(jsonData);
		}
		// AJAX error handler
		function onError(){
			$('#timer').html('<p><strong>Ajax error!</strong> </p>');
		}

		// prepar URL
		var urlTS = 'https://api.thingspeak.com/update?api_key=IKYH9WWZLG5TVYF2&field1=';
		urlTS = urlTS + app.heartRate;
		// make the AJAX call
		$.ajax({
			url: urlTS,
			type: "GET",
			dataType: "json",
			success: onDataReceived,
			error: onError
		});
	}
	// define an update function
	var count = 0;
	function update() {
		// get data
		//$('#timer').html(count);
		//count = count + 1;
		getData();
		// set timeout
		setTimeout(update, 16000);
	}
     // call update
	update();

});

/**
 * Adjust the canvas dimensions based on its container's dimensions.
 */
function respondCanvas()
{
	var canvas = $('#canvas');
	var container = $(canvas).parent();
	canvas.attr('width', $(container).width() ); // Max width
	//canvas.attr('height', $(container).height() ); // Max height
}

app.showMessage = function(info)
{
  $('#info').html(info);
};

app.showData = function(data)
{
  $('#data').html(data);
};

// Called when BLE and other native functions are available.
app.onDeviceReady = function()
{
  //app.showMessage('Press the CONNECT button to scan and connect with ' + deviceName);
};

app.connectOrDisconnect = function()
{
  if (app.device == null)
  {
    app.connect();

    $('#button-connect').html('SCANNING');
  }
  else
  {
    nRF51_ble.close();

    app.device = null;
    //app.showMessage('Press the CONNECT button to scan and connect with ' + deviceName);
    app.showData('Not connected to ' + deviceName);
    $('#button-connect').html('CONNECT');
  }
};

app.connect = function()
{
  app.showMessage('Scanning for ' + deviceName);

  nRF51_ble.connect(
      deviceName, // BLE name
    function(device)
    {
      app.device = device;
      app.showMessage('Connected to ' + deviceName);
      app.showData('HRM shown below');
      $('#button-connect').html('DISCONNECT');

      device.setNotification(function(data)
      {
        //$('#button-state').html('BUTTON STATE: ' +new Uint8Array(data)[0]);
        var hrm = new Uint8Array(data);

        //hrm = String.fromCharCode.apply(null, new Uint8Array(data))
        //$('#hrm').html(hrm[0]);
        // check flags
        // See https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
        if(hrm[0] & 0x1) {
          // 16-bit
          app.heartRate = (hrm[2] << 8) + hrm[1];
        }
        else {
            // 8-bit
            app.heartRate = hrm[1];
        }
        // set heart rate display
        $('#hrm').html(app.heartRate);

        //app.drawLines([new DataView(data).getUint16(0, true)]);
        app.drawLines([app.heartRate]);
      });
    },
    function(errorCode)
    {
      app.device = null;
      //app.showMessage('Press the CONNECT button to scan and connect with ' + deviceName);
      app.showData('Unable to connect to ' + deviceName + ' - error: ' + errorCode);
      $('#button-connect').html('CONNECT');
    });
};

document.addEventListener(
  'deviceready',
  function() { evothings.scriptsLoaded(app.onDeviceReady) },
  false);
