/*
 *  Copyright 2008 Andreas Bolka <andreas@bolka.at>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.helma.repository;

import java.io.File;
import java.io.BufferedInputStream;
import java.io.InputStream;
import java.io.IOException;

public class ShebangFileResource extends FileResource {

    public ShebangFileResource(File file) {
        super(file);
    }

    @Override
    public InputStream getInputStream() throws IOException {
        BufferedInputStream stream = new BufferedInputStream(super.getInputStream());
        stream.mark(2);
        if (stream.read() == '#' && stream.read() == '!') {
            // skip a line: a line is terminated by \n or \r or \r\n (just as
            // in BufferedReader#readLine)
            for (int c = stream.read(); c != -1; c = stream.read()) {
                if (c == '\n')
                    break;
                if (c == '\r') {
                    stream.mark(1);
                    if (stream.read() != '\n')
                        stream.reset();
                    break;
                }
            }
        } else {
            stream.reset();
        }
        return stream;
    }

}
