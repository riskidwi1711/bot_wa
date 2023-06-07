const { default: axios } = require("axios");
const qrcode = require("qrcode-terminal");
const { Client, List, Buttons, MessageMedia } = require("whatsapp-web.js");
const mysql = require("mysql");
const sendNotification = require("./notify");
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: '',
  database: "polling",
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

const client = new Client({puppeteer: {
		args: ['--no-sandbox'],
	}});
const questions = [
  "Nama",
  "NIK",
  "Kecamatan",
  "Kelurahan",
  "RT",
  "RW",
  "No Handphone/Wa",
];
const absen = ["Pilih Acara", "Nama", "Alamat", "No Handphone"];
let kecamatan = [
  {
    title: "Pilih Kecamatan",
    rows: [
      { title: "kec_koja" },
      { title: "kec_panjaringan" },
      { title: "kec_tanjung_priok" },
      { title: "kec_cilincing" },
      { title: "kec_kelapa_gading" },
      { title: "kec_pademangan" },
    ],
  },
];
let list_kelurahan = [];
let list_acara = [];
let answer = [];
let base_url = 'http://sirepks.xyz/api';

function createState(id) {
  let indexUnique = answer.findIndex((obj) => obj.chatID === id);
  if (indexUnique === -1) {
    answer.push({
      chatID: id,
      state: "",
      position: "begin",
      currentQuestion: 0,
      absenQuestion: 0,
      imageUrl: "",
      acara: "",
      nama: "",
      nik: "",
      kecamatan: "",

      kelurahan: "",
      rt: "",
      rw: "",
      no_telp: "",
    });
  }
}

const uploadFoto = async (message, cb) => {
  if (message) {
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      axios
        .post(`${base_url}/uploadbase64`, {
          image: media.data,
        })
        .then((res) => {
          if (res.data.status === "success") {
            getState(message.from).imageUrl = res.data.file_name;
            cb(null, "success");
          } else {
            cb(true);
          }
        })
        .catch((err) => {
          cb(true);
          console.log(err);
        });
    }else{
      cb(true);
    }
  }else{
    cb(true);
  }
};

function getState(id) {
  let index = answer.findIndex((obj) => obj.chatID === id);
  return answer[index] !== undefined ? answer[index] : false;
}

const setState = async (index, chatID, text, message = false) => {
  switch (index) {
    case 1:
      getState(chatID).nama = text;
      break;
    case 2:
      getState(chatID).nik = text;
      break;
    case 3:
      getState(chatID).kecamatan = text;
      break;
    case 4:
      getState(chatID).kelurahan = text;
      break;
    case 5:
      break;
    case 6:
      getState(chatID).rt = text;
      break;
    case 7:
      getState(chatID).rw = text;
      break;
    case 8:
      getState(chatID).no_telp = text;
      break;
  }
};

function setDataAbsen(index, chatID, text) {
  switch (index) {
    case 1:
      getState(chatID).acara = text;
      break;
    case 2:
      getState(chatID).nama = text;
      break;
    case 3:
      getState(chatID).alamat = text;
      break;
    case 4:
      getState(chatID).no_telp = text;
      break;
  }
}

function getKelurahan(slug, chatID) {
  try {
    let res = axios
      .get(`${base_url}/getkelurahan/${slug}`)
      .then((e) => {
        list_kelurahan = [];
        let kelurahan = [
          {
            title: "Pilih kelurahan",
            rows: e.data.map((eee) => {
              list_kelurahan.push(eee.slug);
              return { title: eee.slug };
            }),
          },
        ];

        let list = new List(
          "Klik tombol kelurahan untuk membuka list dan pilih salah satu kelurahan yang tersedia",
          "Kelurahan",
          kelurahan,
          "Pilih kelurahan",
          "footer"
        );
        client.sendMessage(chatID, list);
      })
      .catch((err) => {
        getState(chatID).currentQuestion = 3;
        client
          .sendMessage(chatID, "Maaf silahkan ulangi pilih kecamatan")
          .then(() => {
            let list = new List(
              "Klik tombol kecamatan untuk membuka list dan pilih salah satu kecamatan yang tersedia",
              "Kecamatan",
              kecamatan,
              "Pilih Kecamatan",
              "footer"
            );
            client.sendMessage(chatID, list);
          });
      });
    return res;
  } catch (error) {
    getState(chatID).currentQuestion = 3;
    client
      .sendMessage(chatID, "Maaf silahkan ulangi pilih kecamatan")
      .then(() => {
        let list = new List(
          "Klik tombol kecamatan untuk membuka list dan pilih salah satu kecamatan yang tersedia",
          "Kecamatan",
          kecamatan,
          "Pilih Kecamatan",
          "footer"
        );
        client.sendMessage(chatID, list);
      });

    return error;
  }
}

function getAcara(chatID) {
  con.query("SELECT * FROM data_acaras", (err, res) => {
    if (err) {
      client.sendMessage(chatID, "Maaf terjadi kesalahan");
    } else {
      if (res.length < 1) {
        client.sendMessage(chatID, "Maaf belum ada acara yang tersedia");
      } else {
        list_acara = [];
        let acara = [
          {
            title: "Pilih Acara",
            rows: res.map((eee) => {
              list_acara.push(eee.kode_acara);
              return { title: eee.title, description: eee.kode_acara };
            }),
          },
        ];

        let list = new List(
          "Klik tombol acara untuk membuka list dan pilih salah satu acara yang tersedia",
          "Acara",
          acara,
          "Pilih Acara",
          "footer"
        );
        client.sendMessage(chatID, list);
      }
    }
  });
}

const save = async (chatID) => {
  let data = {
    nama: getState(chatID).nama,
    nik: getState(chatID).nik,
    no_handphone: getState(chatID).no_telp,
    kelurahan: getState(chatID).kelurahan,
    kecamatan: getState(chatID).kecamatan,
    rt: getState(chatID).rt,
    rw: getState(chatID).rw,
    imageUrl: getState(chatID).imageUrl,
  };
  try {
    axios
      .post(`${base_url}/savefromwa`, data)
      .then((res) => {
        client
          .sendMessage(chatID, "✅ Berhasil menyimpan, terimakasih")
          .then(() => {
            sendNotification(
              "Notifikasi WhatsApp",
              `${data.nama} Berhasil mendaftar sebagai calon pemilih melalui whatsapp`,
              "whatsapp",
              () => {
                getState(chatID).state = "";
                getState(chatID).currentQuestion = 0;
              }
            );
          });
      })
      .catch((err) => {
        client
          .sendMessage(chatID, "❌ Maaf terjadi kesalahan silahkan coba lagi")
          .then(() => {
            getState(chatID).state = "";
            getState(chatID).currentQuestion = 0;
          });
      });
  } catch (error) {
    console.log(error);
  }
};

function validateAcara(text, chatID) {
  let acaraDip = text.split(/\r?\n/);
  if (acaraDip.length > 1) {
    if (list_acara.includes(acaraDip[1])) {
      getState(chatID).acara = acaraDip[1];
      client.sendMessage(chatID, "*1. Masukkan Nama Anda :*");
      getState(chatID).absenQuestion++;
    } else {
      client
        .sendMessage(chatID, "Maaf silahkan pilih kembali acara yang tersedia")
        .then(() => {
          getAcara(chatID);
        });
    }
  } else {
    client
      .sendMessage(chatID, "Maaf silahkan pilih kembali acara yang tersedia")
      .then(() => {
        getAcara(chatID);
      });
  }
}

function saveAbsen(chatID) {
  try {
    let data = {
      acara: getState(chatID).acara,
      nama: getState(chatID).nama,
      alamat: getState(chatID).alamat,
      no_handphone: getState(chatID).no_telp,
    };
    axios
      .post(`${base_url}/absen`, data)
      .then((e) => {
        client
          .sendMessage(chatID, "✅ Berhasil menyimpan, terimakasih")
          .then(() => {
            sendNotification(
              "Notifikasi WhatsApp",
              `${data.nama} Berhasil absen melalui whatsapp`,
              "whatsapp",
              () => {
                getState(chatID).state = "";
                getState(chatID).absenQuestion = 0;
              }
            );
          });
      })
      .catch((err) => {
        client
          .sendMessage(chatID, "❌ Maaf terjadi kesalahan silahkan coba lagi")
          .then(() => {
            getState(chatID).state = "";
            getState(chatID).absenQuestion = 0;
          });
      });
  } catch (error) {
    console.log(error);
  }
}

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (message) => {
  //custom

  if (message.from === "6281382161911@c.us") {
    client
      .sendMessage(message.from, "Pagi byy, yang semangat ya cantik kerja nya")
      .then(() => {
        client.sendMessage(
          message.from,
          "hati hati berangkatnya, jangan lupa sarapan, jangan kurang2in sayangnya ke aku wkwkw"
        );
      })
      .then(() => {
        client.sendMessage(message.from, "love u auliaaa");
      })
      .then(() => {
        client.sendMessage(
          message.from,
          "Aku tidur jam 3.30 by, kayanya bakal bangun siang nii :D, oiya jam 1 siang aku ada interview smg kebangun sblm jam 1 ya wkwk"
        );
      });
  }

  //createstate
  createState(message.from);
  setState(
    getState(message.from).currentQuestion,
    message.from,
    message.body,
    message
  );
  setDataAbsen(
    getState(message.from).absenQuestion,
    message.from,
    message.body
  );

  if (message.body === "/daftar") {
    getState(message.from).state = "/daftar";
    getState(message.from).currentQuestion = 0;
    getState(message.from).absenQuestion = 0;
  } else if (message.body === "/absen") {
    getState(message.from).state = "/absen";
    getState(message.from).absenQuestion = 0;
    getState(message.from).currentQuestion = 0;
  }

  if (getState(message.from).state === "/daftar") {
    if (message.body === "/benar") {
      save(message.from);
    } else if (message.body === "/ulang") {
      getState(message.from).currentQuestion = 0;
    }

    switch (getState(message.from).currentQuestion) {
      case 0:
        client.sendMessage(message.from, "Nama");
        getState(message.from).currentQuestion++;
        break;
      case 1:
        client.sendMessage(message.from, "NIK");
        getState(message.from).currentQuestion++;
        break;
      case 2:
        let list = new List(
          "Klik tombol kecamatan untuk membuka list dan pilih salah satu kecamatan yang tersedia",
          "Kecamatan",
          kecamatan,
          "Pilih Kecamatan",
          "footer"
        );
        client.sendMessage(message.from, list);
        getState(message.from).currentQuestion++;
        break;
      case 3:
        getKelurahan(message.body, message.from);
        getState(message.from).currentQuestion++;
        break;
      case 4:
        if (list_kelurahan.includes(message.body)) {
          client.sendMessage(message.from, "Masukan Foto");
          getState(message.from).currentQuestion++;
        } else {
          getState(message.from).currentQuestion = 4;
          client
            .sendMessage(message.from, "Maaf silahkan ulangi memilih kelurahan")
            .then(() => {
              getKelurahan(getState(message.from).kecamatan, message.from);
            });
        }
        break;
      case 5:
        uploadFoto(message, (err, res) => {
          if (err) {
            client.sendMessage(
              message.from,
              "Maaf silahkan ulangi masukan foto"
            );
          } else {
            client.sendMessage(message.from, "Masukan RT");
            getState(message.from).currentQuestion++;
          }
        });
        break;
      case 6:
        client.sendMessage(message.from, "RW");
        getState(message.from).currentQuestion++;
        break;
      case 7:
        client.sendMessage(message.from, "No Telp");
        getState(message.from).currentQuestion++;
        break;
      case 8:
        getState(message.from).position = "end";
        let string = `Nama : ${getState(message.from).nama}\nNIK : ${
          getState(message.from).nik
        }\nNo_Telp : ${getState(message.from).no_telp}\nKecamatan : ${
          getState(message.from).kecamatan
        }\nKelurahan : ${getState(message.from).kelurahan}\nRT/RW : ${
          getState(message.from).rt
        }/${getState(message.from).rw}\n`;

        if (getState(message.from).imageUrl) {
          const media = await MessageMedia.fromUrl(
            `http://34.101.77.146/data_file/${getState(message.from).imageUrl}`
          );
          client.sendMessage(message.from, media);
        }
        let button = new Buttons(
          "Apakah data yang dimasukan sudah benar?",
          [{ body: "/benar" }, { body: "/ulang" }],
          string,
          "Silahkan pilih benar atau ulang"
        );
        client.sendMessage(message.from, button);
        getState(message.from).currentQuestion++;
        break;
    }
  }

  if (getState(message.from).state === "/absen") {
    if (message.body === "/benar") {
      saveAbsen(message.from);
    } else if (message.body === "/ulang") {
      getState(message.from).absenQuestion = 0;
    }

    switch (getState(message.from).absenQuestion) {
      case 0:
        getAcara(message.from);
        getState(message.from).absenQuestion++;
        break;
      case 1:
        validateAcara(message.body, message.from);
        break;
      case 2:
        client.sendMessage(message.from, "*2. Masukkan Alamat Anda :*\nNama Jalan, RT/RW, Kelurahan");
        getState(message.from).absenQuestion++;
        break;
      case 3:
        client.sendMessage(message.from, "*3. Masukkan Nomor Whatsapp :*\nNomor Tanpa Spasi");
        getState(message.from).absenQuestion++;
        break;
      case 4:
        getState(message.from).position = "end";
        let string = `Acara : ${getState(message.from).acara}\nNama : ${
          getState(message.from).nama
        }\nAlamat : ${getState(message.from).alamat}\nNo Telp/Wa : ${
          getState(message.from).no_telp
        }\n`;
        let button = new Buttons(
          "Apakah data yang dimasukan sudah benar?",
          [{ body: "/benar" }, { body: "/ulang" }],
          string,
          "Jika sudah pilih *benar*\nJika belum pilih *ulangi*"
        );
        client.sendMessage(message.from, button);
        getState(message.from).absenQuestion++;
        break;
    }
  }

  console.log(getState(message.from))
});

client.on("disconnected", (reason) => {
  console.log("disconnect Whatsapp-bot", reason);
});

client.initialize();
