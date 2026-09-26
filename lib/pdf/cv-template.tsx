import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CvData } from '../types'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
    lineHeight: 1.4,
  },
  header: { marginBottom: 2 },
  name: { fontSize: 20, fontWeight: 'bold' },
  title: { fontSize: 12, color: '#374151', marginTop: 2 },
  contact: { fontSize: 9, color: '#4b5563', marginTop: 4 },
  summary: { marginTop: 10, fontSize: 10, lineHeight: 1.5 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 2,
  },
  skills: { marginTop: 4, fontSize: 10, lineHeight: 1.5 },
  item: { marginTop: 6 },
  itemHeading: { fontSize: 10, fontWeight: 'bold' },
  itemSub: { fontSize: 9, color: '#4b5563', marginBottom: 1 },
  bullet: { fontSize: 10, lineHeight: 1.5, marginLeft: 10, marginTop: 1 },
  notes: { marginTop: 8, fontSize: 8, color: '#6b7280', lineHeight: 1.4 },
  pageFoot: { position: 'absolute', bottom: 18, right: 36, fontSize: 8, color: '#9ca3af' },
})

// Enough room after a heading for at least one line of body, so a section
// title never lands alone at the foot of a page.
const TITLE_KEEP_AHEAD = 22

export function CvDocument({ cv }: { cv: CvData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View break={false}>
          <Text style={styles.name}>{cv.name}</Text>
          {cv.title ? <Text style={styles.title}>{cv.title}</Text> : null}
          <Text style={styles.contact}>
            {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join('  |  ')}
          </Text>
          {cv.summary ? <Text style={styles.summary}>{cv.summary}</Text> : null}
        </View>

        {cv.skills.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle} minPresenceAhead={TITLE_KEEP_AHEAD}>
              Core Skills
            </Text>
            <Text style={styles.skills}>{cv.skills.join('  •  ')}</Text>
          </View>
        ) : null}

        {cv.sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle} minPresenceAhead={TITLE_KEEP_AHEAD}>
              {section.title}
            </Text>
            {section.items.map((item, i) => (
              <View key={`${section.title}-${i}`} style={styles.item} break={false}>
                <Text style={styles.itemHeading}>{item.heading}</Text>
                {item.subheading ? <Text style={styles.itemSub}>{item.subheading}</Text> : null}
                {item.bullets.map((b, bi) => (
                  <Text key={bi} style={styles.bullet}>
                    • {b}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}

        {cv.notes.length > 0 ? (
          <View break={false} style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle} minPresenceAhead={TITLE_KEEP_AHEAD}>
              Before You Send
            </Text>
            {cv.notes.map((n, i) => (
              <Text key={i} style={styles.notes}>
                • {n}
              </Text>
            ))}
          </View>
        ) : null}

        <Text
          fixed
          style={styles.pageFoot}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : '')}
        />
      </Page>
    </Document>
  )
}
