      * AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SHAPES.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-R PIC 9(3)V99 VALUE 2.00.
       01 WS-AREA PIC 9(5)V99.
       PROCEDURE DIVISION.
       MAIN-PARA.
           COMPUTE WS-AREA = 3.14159 * WS-R * WS-R.
           DISPLAY "AREA=" WS-AREA.
           PERFORM DESCRIBE-PARA.
           STOP RUN.
       DESCRIBE-PARA.
           DISPLAY "DONE".
