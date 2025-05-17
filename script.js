function addLineBreaks() {
    const aikenInput = document.getElementById('aikenInput').value;
    const lines = aikenInput.split('\n');
    let processedLines = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let siguiente = lines[i + 1];
        if (line.startsWith("ANSWER:") && siguiente !='') {
            processedLines.push(line);
            processedLines.push(''); // Add a blank line after the answer
        }else processedLines.push(line);
    }
      document.getElementById('iliasOutput').textContent = processedLines.join('\n');
    document.getElementById('iliasOutput').style.display = 'block';
  }



function convertAikenToILIAS() {
    const aikenInput = document.getElementById('aikenInput').value;
    const errorMessageElement = document.getElementById('error-message');
    errorMessageElement.style.display = 'none';

    const lines = aikenInput.trim().split('\n').map(line => line.trim());
    const processedAiken = [];
    let currentQuestion = [];

    // Heuristically detect the start of a new question and add a blank line if needed
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isNewQuestion = (i === 0 || lines[i - 1] === '') &&  // Added check for previous line
                              line.length > 0 &&
                              !line.startsWith(' ') &&
                              (line.match(/^[0-9]+\.\s/) || line.match(/^[a-zA-Z]+\)\s/) || line.match(/^[a-zA-Z]\.\s/) || line.match(/^[0-9]+\.+[0-9]/) || line.match(/^[0-9]+\.+[0-9]+[0-9]/));

        if (isNewQuestion && currentQuestion.length > 0) {
            if (processedAiken.length > 0 && processedAiken[processedAiken.length - 1] !== '') {
                processedAiken.push('');
            }
            processedAiken.push(...currentQuestion);
            currentQuestion = [line];
        } else {
            currentQuestion.push(line);
        }
    }
    if (currentQuestion.length > 0) {
        if (processedAiken.length > 0 && processedAiken[processedAiken.length - 1] !== '') {
            processedAiken.push('');
        }
        processedAiken.push(...currentQuestion);
    }

    const aikenText = processedAiken.join('\n');
    const questions = aikenText.trim().split('\n\n');

    let iliasXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE questestinterop SYSTEM "ims_qtiasiv1p2p1.dtd">
<questestinterop>`;

    let questionno = 0;
    let hasErrors = false;

    for (const questionBlock of questions) {
        if (questionBlock.trim() === "") {
            continue;
        }

        questionno++;
        const lines = questionBlock.split('\n').map(line => line.trim());
        let questionTitle = null;
        let options = [];
        let correctAnswer = null;

        if (lines.length < 2) {
            console.warn(`Pregunta ${questionno}: Bloque de pregunta incompleto, se ignorará.`);
            continue;
        }

        questionTitle = lines.find(line => line.length > 0 && !line.startsWith(' ') && (line.match(/^[0-9]+\.\s/) || line.match(/^[a-zA-Z]+\)\s/) || line.match(/^[a-zA-Z]\.\s/) || line.match(/^[0-9]+\.+[0-9]/) || line.match(/^[0-9]+\.+[0-9]+[0-9]/))) || lines[0];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("ANSWER:")) {
                correctAnswer = line.substring(line.indexOf(":") + 1).trim().toUpperCase();
            } else if (line.match(/^[A-Z]\)\s/i) || line.match(/^[A-Z]\.\s/i) || line.match(/^[a-z]\)\s/i) || line.match(/^[a-z]\.\s/i)) {
                const identifier = line.substring(0, 1).toUpperCase();
                const text = line.substring(line.indexOf('.') + 1).trim() || line.substring(line.indexOf(')') + 1).trim();
                options.push({ identifier, text });
            }
        }

        if (!questionTitle) {
            console.error(`Pregunta ${questionno}: No se encontró título.`);
            hasErrors = true;
            continue;
        }

        if (!correctAnswer || !options.some(opt => opt.identifier === correctAnswer)) {
            console.error(`Pregunta ${questionno}: No se encontró una respuesta válida.`);
            hasErrors = true;
            continue;
        }

        if (options.length < 2) {
            console.error(`Pregunta ${questionno}: Debe haber al menos dos opciones.`);
            hasErrors = true;
            continue;
        }

        const itemId = `il_0_qst_${Date.now()}_${questionno}`;

        iliasXML += `
  <item ident="${itemId}" title="${escapeXml(questionTitle)}" maxattempts="1">
    <qticomment/>
    <duration>P0Y0M0DT0H1M0S</duration>
    <itemmetadata>
      <qtimetadata>
        <qtimetadatafield>
          <fieldlabel>ILIAS_VERSION</fieldlabel>
          <fieldentry>4.3.5 2013-10-08</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>QUESTIONTYPE</fieldlabel>
          <fieldentry>SINGLE CHOICE QUESTION</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>AUTHOR</fieldlabel>
          <fieldentry>Diego (JS AIKEN)</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>textgaprating</fieldlabel>
          <fieldentry>cs</fieldentry>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>fixedTextLength</fieldlabel>
          <fieldentry/>
        </qtimetadatafield>
        <qtimetadatafield>
          <fieldlabel>identicalScoring</fieldlabel>
          <fieldentry>1</fieldentry>
        </qtimetadatafield>
      </qtimetadata>
    </itemmetadata>
    <presentation label="${escapeXml(questionTitle)}">
      <flow>
        <material><mattext texttype="text/xhtml">${escapeXml(questionTitle)}</mattext></material>
        <response_lid ident="MCSR" rcardinality="Single" shuffle="Yes">
          <render_choice>`;

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            iliasXML += `
            <response_label ident="${option.identifier}">
              <material><mattext texttype="text/plain">${escapeXml(option.text)}</mattext></material>
            </response_label>`;
        }

        iliasXML += `
          </render_choice>
        </response_lid>
      </flow>
    </presentation>
    <resprocessing>
      <outcomes><decvar varname="SCORE" vartype="integer" defaultval="0"/></outcomes>`;

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const points = option.identifier === correctAnswer ? 1 : 0;
            iliasXML += `
      <respcondition continue="Yes">
        <conditionvar><varequal respident="MCSR">${option.identifier}</varequal></conditionvar>
        <setvar action="Add">${points}</setvar>
        <displayfeedback feedbacktype="Response" linkrefid="response_${option.identifier}"/>
      </respcondition>
      <itemfeedback ident="response_${option.identifier}" view="All">
        <flow_mat><material><mattext/></material></flow_mat>
      </itemfeedback>`;
        }

        iliasXML += `
    </resprocessing>
  </item>`;
    }

    iliasXML += `
</questestinterop>`;

    if (hasErrors) {
        errorMessageElement.style.display = 'block';
        document.getElementById('iliasOutput').textContent = 'Se encontraron errores al procesar las preguntas. Revisa la consola para más detalles.';
        document.getElementById('downloadButton').style.display = 'none';
    } else {
        document.getElementById('iliasOutput').textContent = iliasXML;
        document.getElementById('downloadButton').style.display = 'block';
        document.iliasXMLContent = iliasXML;
    }
}

function downloadXML() {
    const filename = 'ilias_questions_aiken.xml';
    const xmlContent = document.iliasXMLContent;
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
}