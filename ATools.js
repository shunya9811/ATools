// グローバル静的API設定オプション
const config = {
    url: "https://openlibrary.org/search.json?",
    CLIOutputDivID: "shell",
    CLITextInputID: "shellInput"
}

let CLITextInput = document.getElementById(config.CLITextInputID);
let CLIOutputDiv = document.getElementById(config.CLIOutputDivID);

CLITextInput.addEventListener("keyup", (event)=>submitSearch(event));

async function submitSearch(event){
    if (event.key =="Enter"){
        let parsedCLIArray = ATools.commandLineParser(CLITextInput.value);

        ATools.appendMirrorParagraph(CLIOutputDiv);
        CLITextInput.value = '';

        // CLIの入力文字列が"ATools <commandName> <arguments>" に適合しない場合はエラーになります。
        if (parsedCLIArray.length == 0 || parsedCLIArray[0] != 'ATools'){
            ATools.appendErrorParagraph(CLIOutputDiv);
            
            CLIOutputDiv.scrollTop = CLIOutputDiv.scrollHeight;
            CLITextInput.value = '';

            return
        }

        // テキストフィールドからのリクエスト時にAPIエンドポイントのURLに付加されるフォームクエリ文字列
        let queryString = ATools.queryStringFromParsedCLIArray(parsedCLIArray);
        CLIOutputDiv.scrollTop = CLIOutputDiv.scrollHeight;

        // API エンドポイントからのレスポンスを JS オブジェクトとして取得します。
        let queryResponseObject = await ATools.queryResponseObjectFromQueryString(queryString);

        // 結果を段落として、CLIOutputDivに追加します。
        ATools.appendResponseParagraphsFromQueryResponseObject(CLIOutputDiv, queryResponseObject, parsedCLIArray);
        CLIOutputDiv.scrollTop = CLIOutputDiv.scrollHeight;

    }
}

class ATools{
    static commandLineParser(CLIInputString)
    {
        let parsedArray = CLIInputString.trim().split(" ");
        if (parsedArray[0] != "ATools" || (parsedArray[1] != "searchByTitle" && parsedArray[1] != "uniqueNameCount" && parsedArray[1] != "titlesByUniqueName")) return [];

        if (parsedArray[1] == "searchByTitle" && !(parsedArray.length == 3 || parsedArray.length == 4)) return [];

        if ((parsedArray[1] == "uniqueNameCount" || parsedArray[1] == "titlesByUniqueName") && parsedArray.length != 3) return [];
        
        return parsedArray
    }

    static appendMirrorParagraph(parentDiv)
    {

        parentDiv.innerHTML+=
            `<p class="m-0">
                <span style='color:green'>student</span>
                <span style='color:magenta'>@</span>
                <span style='color:blue'>recursionist</span>
                : ${CLITextInput.value}
            </p>
            `;

        return;
    }

    static appendErrorParagraph(parentDiv)
    {
        parentDiv.innerHTML+=
            `<p class="m-0">
                <span style='color:red'>CLIError</span>: invalid input. must take form "packageName commandName" or "packageName commandName arguments"
                where packageName is 'ATools', commandName is either 'isbn-lookup' or 'search', and there are exactly 1 or 2 whitespaces.
            </p>`;

        return
    }

    static isNumber(number){
        return typeof Number(number) == "number" && !isNaN(number) && Number(number) > 0 && Number(number) % 1 == 0;
    }

    static queryStringFromParsedCLIArray(parsedCLIArray)
    {
        // コマンドがsearchByTitleである場合、2パターンあるためどちらの場合でも検索できるように条件を考える
        if(parsedCLIArray[1] == 'searchByTitle' && ((parsedCLIArray.length == 3) || (parsedCLIArray.length == 4 && ATools.isNumber(parsedCLIArray[3])))) return `title=${parsedCLIArray[2]}`;

        // コマンドがuniqueNameCountかtitlesByUniqueNameの場合、author=〇〇として出力
        else if (parsedCLIArray[1] == 'uniqueNameCount' || parsedCLIArray[1] == 'titlesByUniqueName') return  `author=${parsedCLIArray[2]}`;

        // コマンドが他のものであれば、BTools はサポートしていないので null を返します。
        else{
            console.log("ATools.queryStringFromParsedCLIObject():: invalid command type");
            return;
        }
    }

    // クエリを実行して js オブジェクトを取得します。
    static async queryResponseObjectFromQueryString(queryString)
    {
        let queryResponseObject = {};
        let queryURL = config.url+queryString;
        await fetch(queryURL).then(response=>response.json()).then(data=>queryResponseObject = data);
        return queryResponseObject;
    }

    static appendResponseParagraphsFromQueryResponseObject(parentDiv, queryResponseObject, parsedCLIArray)
    {
        // 一致するものがない場合は、その旨のメッセージをレンダリングします。
        if (queryResponseObject['numFound'] == 0){
            parentDiv.innerHTML += `<p class="m-0"> <span style='color:turquoise'>openLibrary</span>: 0 matches </p>`;
        }

        else if (parsedCLIArray[1] == "searchByTitle"){
            // 一致した数を表示
            parentDiv.innerHTML+=`<p class="m-0"> <span style='color:turquoise'>openLibrary</span>: at least ${queryResponseObject['docs'].length} matches`;

            /*
            このコードだと、タイトルが同じ作品がなんども繰り返されてしまう　だからハッシュマップを使ってかぶりを消す
            for (let i = 0; i < queryResponseObject["docs"].length; i++){
                let queryResponseDocument = queryResponseObject['docs'][i];

                let matchParagraphString =
                    `<p class="m-0">
                        title: ${queryResponseDocument["title"]},
                        key: ${queryResponseDocument["key"]}
                    </p>
                    `;
                
                parentDiv.innerHTML += matchParagraphString;
            }*/

            let titleHash = ATools.generateUniqueBookTitleHash(queryResponseObject, parsedCLIArray);
            for (let title in titleHash){
                let matchParagraphString =
                    `<p class="m-0">
                        title: ${title},
                        key: ${titleHash[title]}
                    </p>
                    `;
                
                parentDiv.innerHTML += matchParagraphString;
            }

        }

        else if (parsedCLIArray[1] == "uniqueNameCount"){
            /*
            for (let i = 0; i < queryResponseObject["docs"].length; i++){
                let queryResponseDocument = queryResponseObject['docs'][i];

                let matchParagraphString =
                    `<p class="m-0">
                        ${queryResponseDocument["author_name"]}
                    </p>
                    `;
                
                parentDiv.innerHTML += matchParagraphString;
            }*/

            let authorHash = ATools.generateUniqueBookAuthor(queryResponseObject, parsedCLIArray[2]);
            for (let author in authorHash){
                let matchParagraphString =
                    `<p class="m-0">
                        ${author}
                    </p>
                    `;
                
                parentDiv.innerHTML += matchParagraphString;
            }
        }

        else if (parsedCLIArray[1] == "titlesByUniqueName"){
            let authorHash = ATools.generateUniqueBookAuthor(queryResponseObject, parsedCLIArray[2]);
            for (let author in authorHash){
                let matchParagraphString =
                    `<p class="m-0">
                        ${author} -> ${authorHash[author]}
                    </p>
                    `;
                
                parentDiv.innerHTML += matchParagraphString;
            }
        }
        return;
    }

    static generateUniqueBookTitleHash(queryResponseObject, parsedCLIArray){
        let hash = {};
        let count = 0;
        for (let i = 0; i < queryResponseObject["docs"].length; i++){
            let queryResponseDocument = queryResponseObject['docs'][i];

            if (hash[queryResponseDocument["title"]] == undefined){
                hash[queryResponseDocument["title"]] = queryResponseDocument["key"];
                count++;
            }

            if (count == Number(parsedCLIArray[3])){
                return hash;
            }
        }

        return hash;
    }

    static generateUniqueBookAuthor(queryResponseObject, authorName){
        let hash = {};
        for (let i = 0; i < queryResponseObject["docs"].length; i++){
            let queryResponseDocument = queryResponseObject['docs'][i];
            /*
            APIの構造を捉え間違っている

            if (ATools.matchAuthorName(queryResponseDocument["author_name"], authorName) && hash[queryResponseDocument["author_name"]] == undefined){
                let array = [];
                array[0] = queryResponseDocument["title"];
                hash[queryResponseDocument["author_name"]] = array;
            }
            else if (ATools.matchAuthorName(queryResponseDocument["author_name"], authorName)){
                hash[queryResponseDocument["author_name"]].push(queryResponseDocument["title"]);
            }*/

            for (let j = 0; j < queryResponseDocument["author_name"].length; j++){
                let queryResponseAuthor = queryResponseDocument["author_name"][j];

                if (ATools.matchAuthorName(queryResponseAuthor, authorName) && hash[queryResponseAuthor] == undefined){
                    hash[queryResponseAuthor] = [queryResponseDocument["title"]]; // 注意点　連想配列のvalueを配列にしないとpushできない
                }
                else if (ATools.matchAuthorName(queryResponseAuthor, authorName)){
                    hash[queryResponseAuthor].push(queryResponseDocument["title"]);
                }
            }
        }

        return hash;
    }

    static matchAuthorName(queryResponseAuthor, authorName){
        return queryResponseAuthor.toUpperCase().includes(authorName.toUpperCase());
    }
}